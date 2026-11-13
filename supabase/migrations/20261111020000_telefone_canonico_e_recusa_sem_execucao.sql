-- Correções da 1ª revisão
--   1. Telefone com ou sem +55 passa a ter a MESMA chave de unicidade.
--      Bloqueio global continua (regra provisória). 8 e 9 dígitos locais seguem distintos.
--   2. Negociação "Não fechou" não guarda data de execução prevista.

-- ===========================================================================
-- 1. TELEFONE CANÔNICO
-- ===========================================================================

-- Chave canônica: só dígitos; remove o DDI 55 apenas quando o número tem
-- 12 ou 13 dígitos (55 + DDD + 8 ou 9 dígitos). Números locais (10 ou 11
-- dígitos) nunca são alterados — inclusive os do DDD 55 — e não se acrescenta
-- nem se remove o nono dígito.
create function public.normalizar_telefone(p_telefone text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
           when d ~ '^55[0-9]{10,11}$' then substr(d, 3)
           else d
         end
  from (select regexp_replace(coalesce(p_telefone, ''), '[^0-9]', '', 'g') as d) s
$$;

-- Registro de conflitos encontrados em dados já gravados. Nada é apagado
-- nem mesclado: os clientes envolvidos ficam marcados até revisão da gestão.
create table public.conflitos_telefone (
  id                 bigint generated always as identity primary key,
  cliente_id         uuid not null references public.clientes (id) on delete cascade,
  telefone_original  text not null,
  telefone_chave     text not null,
  motivo             text not null check (motivo in ('duplicado', 'formato_invalido')),
  detectado_em       timestamptz not null default now(),
  resolvido_em       timestamptz
);
create unique index conflitos_telefone_aberto_unico
  on public.conflitos_telefone (cliente_id) where resolvido_em is null;
comment on table public.conflitos_telefone is
  'Clientes cujo telefone gravado colidiu ou ficou inválido ao aplicar a chave canônica. Resolver manualmente.';

alter table public.clientes
  add column telefone_em_revisao boolean not null default false;
comment on column public.clientes.telefone_em_revisao is
  'true = telefone em conflito pendente de revisão (ver conflitos_telefone). Só a administração altera.';

-- Regras antigas saem: a unicidade passa a valer sobre a chave canônica.
alter table public.clientes drop constraint clientes_telefone_unico;
alter table public.clientes drop constraint clientes_telefone_check;

-- Reconciliação dos registros existentes (idempotente).
--   * formato inválido após normalizar  -> registra conflito, marca, NÃO altera o telefone;
--   * chave repetida entre clientes      -> registra conflito de todos, marca, normaliza;
--   * demais com +55                      -> só normaliza (sem perda de informação).
-- O telefone original de cada cliente em conflito fica em conflitos_telefone.
create function public.reconciliar_telefones()
returns table (cliente_id uuid, telefone_original text, telefone_chave text, motivo text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  drop table if exists pg_temp._telefones;
  create temp table _telefones on commit drop as
    select c.id, c.telefone as original, public.normalizar_telefone(c.telefone) as chave
    from public.clientes c;

  insert into public.conflitos_telefone (cliente_id, telefone_original, telefone_chave, motivo)
  select t.id, t.original, t.chave, 'formato_invalido'
  from _telefones t
  where t.chave !~ '^[0-9]{10,11}$'
  on conflict (cliente_id) where resolvido_em is null do nothing;

  insert into public.conflitos_telefone (cliente_id, telefone_original, telefone_chave, motivo)
  select t.id, t.original, t.chave, 'duplicado'
  from _telefones t
  where t.chave ~ '^[0-9]{10,11}$'
    and exists (select 1 from _telefones o where o.chave = t.chave and o.id <> t.id)
  on conflict (cliente_id) where resolvido_em is null do nothing;

  update public.clientes c
     set telefone_em_revisao = true
   where not c.telefone_em_revisao
     and exists (select 1 from public.conflitos_telefone k
                 where k.cliente_id = c.id and k.resolvido_em is null);

  update public.clientes c
     set telefone = t.chave
    from _telefones t
   where t.id = c.id
     and t.chave ~ '^[0-9]{10,11}$'
     and c.telefone <> t.chave;

  return query
    select k.cliente_id, k.telefone_original, k.telefone_chave, k.motivo
    from public.conflitos_telefone k
    where k.resolvido_em is null
    order by k.telefone_chave, k.cliente_id;
end;
$$;
revoke all on function public.reconciliar_telefones() from public, anon, authenticated;

-- Aplica a reconciliação agora e informa o resultado no log da migração.
do $$
declare
  conflito record;
  total int := 0;
begin
  for conflito in select * from public.reconciliar_telefones() loop
    total := total + 1;
    raise warning 'Telefone em revisão: cliente % (gravado "%", chave "%") — %',
      conflito.cliente_id, conflito.telefone_original, conflito.telefone_chave, conflito.motivo;
  end loop;
  raise notice 'Reconciliação de telefones: % cliente(s) em revisão.', total;
end;
$$;

-- Formato válido obrigatório, exceto para quem está em revisão (preservado como estava).
alter table public.clientes
  add constraint clientes_telefone_canonico
  check (telefone_em_revisao or telefone ~ '^[0-9]{10,11}$');

-- Unicidade da chave entre os clientes sem conflito pendente.
create unique index clientes_telefone_unico
  on public.clientes (telefone) where not telefone_em_revisao;

-- Cadastro e edição: normaliza, valida e bloqueia colisão com QUALQUER cliente
-- (inclusive os em revisão). SECURITY DEFINER para enxergar clientes de outros
-- vendedores sem expor nada além do erro genérico.
create function public.garantir_telefone_canonico()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  contexto_admin boolean := coalesce(auth.role(), '') not in ('authenticated', 'anon');
begin
  -- A marca de revisão é exclusiva da administração.
  if not contexto_admin and (
       (tg_op = 'INSERT' and new.telefone_em_revisao)
    or (tg_op = 'UPDATE' and new.telefone_em_revisao is distinct from old.telefone_em_revisao)
  ) then
    raise exception 'A marcação de revisão de telefone é feita pela administração.'
      using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' and new.telefone is not distinct from old.telefone then
    return new;
  end if;

  new.telefone := public.normalizar_telefone(new.telefone);

  if new.telefone !~ '^[0-9]{10,11}$' then
    raise exception 'Telefone inválido.' using errcode = '23514';
  end if;

  -- Serializa cadastros concorrentes do mesmo número.
  perform pg_advisory_xact_lock(hashtext('clientes.telefone:' || new.telefone));

  if not (contexto_admin and new.telefone_em_revisao) and exists (
    select 1 from public.clientes c
    where c.telefone = new.telefone
      and c.id is distinct from new.id
  ) then
    raise exception 'Já existe um cliente com este telefone.'
      using errcode = '23505';
  end if;

  return new;
end;
$$;

create trigger clientes_telefone_canonico
  before insert or update of telefone, telefone_em_revisao on public.clientes
  for each row execute function public.garantir_telefone_canonico();

-- Conflitos: só a gestão consulta; ninguém altera pela aplicação.
revoke all on public.conflitos_telefone from anon;
alter table public.conflitos_telefone enable row level security;
create policy conflitos_telefone_gestor_select on public.conflitos_telefone
  for select to authenticated
  using ((select public.perfil_atual()) = 'gestor');

-- ===========================================================================
-- 2. "NÃO FECHOU" SEM EXECUÇÃO PREVISTA
-- ===========================================================================

-- Na mesma operação que muda o status para "não fechou", a execução prevista
-- é limpa. O gatilho de histórico (AFTER) registra a mudança com o autor.
create function public.limpar_execucao_na_recusa()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'nao_fechou' then
    new.data_execucao_prevista := null;
  end if;
  return new;
end;
$$;

create trigger negociacoes_recusa_sem_execucao
  before insert or update on public.negociacoes
  for each row execute function public.limpar_execucao_na_recusa();

-- Registros já gravados: limpa e registra no histórico (autor = sistema).
do $$
declare
  total int;
begin
  update public.negociacoes
     set data_execucao_prevista = null
   where status = 'nao_fechou'
     and data_execucao_prevista is not null;
  get diagnostics total = row_count;
  raise notice 'Negociações "não fechou" com execução prevista limpas: %.', total;
end;
$$;

alter table public.negociacoes
  add constraint negociacoes_recusa_sem_execucao
  check (status <> 'nao_fechou' or data_execucao_prevista is null);
