-- CRM Verônica Sá — contrato de dados M1 (execuções), M2 (ações comerciais) e M3 (conversas)
-- Especificação: docs/specs/crm-completion.md.
--
-- REGRAS PROVISÓRIAS (H-E, H-A, H-C): migração apenas aditiva. Enums ampliáveis,
-- nenhuma exclusão de dados, histórico preservado. Sem políticas de DELETE.

-- ===========================================================================
-- M1 — EXECUÇÕES (colunas em negociacoes) — provisório H-E
-- ===========================================================================
create type public.status_execucao as enum ('pendente', 'realizada', 'cancelada');

alter table public.negociacoes
  add column status_execucao               public.status_execucao,
  add column data_execucao_realizada       date,
  add column motivo_cancelamento_execucao  text;

comment on column public.negociacoes.status_execucao is
  'Situação da execução do serviço vendido. Só existe quando status = fechou (provisório H-E).';

-- Ao virar "fechou", a execução nasce pendente; ao sair de "fechou", os campos
-- de execução são limpos (como a execução prevista em "não fechou").
create function public.coerencia_execucao_negociacao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'fechou' then
    if new.status_execucao is null then
      new.status_execucao := 'pendente';
    end if;
  else
    new.status_execucao := null;
    new.data_execucao_realizada := null;
    new.motivo_cancelamento_execucao := null;
  end if;
  return new;
end;
$$;

create trigger negociacoes_execucao_coerente
  before insert or update on public.negociacoes
  for each row execute function public.coerencia_execucao_negociacao();

-- Histórico passa a registrar também os campos de execução.
create or replace function public.registrar_historico_negociacao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  quem uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    insert into public.historico_negociacoes (negociacao_id, alterado_por, campo, valor_anterior, valor_novo)
    values (new.id, quem, 'criada', null, new.status::text);
    return new;
  end if;

  insert into public.historico_negociacoes (negociacao_id, alterado_por, campo, valor_anterior, valor_novo)
  select new.id, quem, mudanca.campo, mudanca.antes, mudanca.depois
  from (values
    ('status',                       old.status::text,                  new.status::text),
    ('valor',                        old.valor::text,                   new.valor::text),
    ('servico_id',                   old.servico_id::text,              new.servico_id::text),
    ('unidade_id',                   old.unidade_id::text,              new.unidade_id::text),
    ('data_venda',                   old.data_venda::text,              new.data_venda::text),
    ('data_perda',                   old.data_perda::text,              new.data_perda::text),
    ('motivo_perda',                 old.motivo_perda,                  new.motivo_perda),
    ('data_execucao_prevista',       old.data_execucao_prevista::text,  new.data_execucao_prevista::text),
    ('status_execucao',              old.status_execucao::text,         new.status_execucao::text),
    ('data_execucao_realizada',      old.data_execucao_realizada::text, new.data_execucao_realizada::text),
    ('motivo_cancelamento_execucao', old.motivo_cancelamento_execucao,  new.motivo_cancelamento_execucao)
  ) as mudanca (campo, antes, depois)
  where mudanca.antes is distinct from mudanca.depois;

  return new;
end;
$$;

-- Backfill não destrutivo: negociações já fechadas ficam pendentes (autor = sistema).
do $$
declare
  total int;
begin
  update public.negociacoes
     set status_execucao = 'pendente'
   where status = 'fechou'
     and status_execucao is null;
  get diagnostics total = row_count;
  raise notice 'Execuções pendentes criadas para negociações fechadas: %.', total;
end;
$$;

alter table public.negociacoes
  -- só negociações fechadas têm execução
  add constraint negociacoes_execucao_so_se_fechou
    check ((status = 'fechou') = (status_execucao is not null)),
  -- realizada <=> data realizada preenchida
  add constraint negociacoes_execucao_realizada_exige_data
    check ((status_execucao is not distinct from 'realizada') = (data_execucao_realizada is not null)),
  -- execução realizada não pode ser anterior à venda
  add constraint negociacoes_execucao_realizada_apos_venda
    check (data_execucao_realizada is null or data_venda is null or data_execucao_realizada >= data_venda),
  -- cancelada exige motivo; nos outros status o motivo é nulo
  add constraint negociacoes_execucao_cancelada_exige_motivo
    check (
      (status_execucao is not distinct from 'cancelada')
      = (nullif(trim(coalesce(motivo_cancelamento_execucao, '')), '') is not null)
      and (motivo_cancelamento_execucao is null or status_execucao = 'cancelada')
    );

create index negociacoes_execucao_realizada_idx
  on public.negociacoes (data_execucao_realizada) where status_execucao = 'realizada';
create index negociacoes_execucao_prevista_idx
  on public.negociacoes (data_execucao_prevista) where status = 'fechou';

-- Visão: as três colunas novas entram no fim.
create or replace view public.vw_negociacoes
with (security_invoker = true)
as
select
  n.id,
  n.cliente_id,
  c.nome  as cliente_nome,
  n.vendedor_id,
  p.nome  as vendedor_nome,
  n.servico_id,
  s.nome  as servico_nome,
  n.unidade_id,
  u.nome  as unidade_nome,
  n.valor,
  n.status,
  n.data_venda,
  n.data_perda,
  n.motivo_perda,
  n.data_execucao_prevista,
  n.criado_em,
  n.atualizado_em,
  n.status_execucao,
  n.data_execucao_realizada,
  n.motivo_cancelamento_execucao
from public.negociacoes n
join public.clientes c on c.id = n.cliente_id
join public.perfis   p on p.id = n.vendedor_id
join public.servicos s on s.id = n.servico_id
join public.unidades u on u.id = n.unidade_id;

-- Execuções do mês: realizadas pela data realizada; pendentes e canceladas
-- pela data prevista. "Atrasada" é regra de tela. SECURITY INVOKER.
create function public.negociacoes_execucao_mes(p_ano int, p_mes int)
returns setof public.vw_negociacoes
language sql
stable
security invoker
set search_path = ''
as $$
  with periodo as (
    select make_date(p_ano, p_mes, 1) as inicio,
           (make_date(p_ano, p_mes, 1) + interval '1 month')::date as fim
  )
  select v.*
  from public.vw_negociacoes v, periodo
  where v.status = 'fechou'
    and (
         (v.status_execucao = 'realizada'
          and v.data_execucao_realizada >= periodo.inicio and v.data_execucao_realizada < periodo.fim)
      or (v.status_execucao in ('pendente', 'cancelada')
          and v.data_execucao_prevista >= periodo.inicio and v.data_execucao_prevista < periodo.fim)
    )
  order by coalesce(v.data_execucao_realizada, v.data_execucao_prevista), v.cliente_nome
$$;
revoke all on function public.negociacoes_execucao_mes(int, int) from public, anon;
grant execute on function public.negociacoes_execucao_mes(int, int) to authenticated;

-- ===========================================================================
-- M2 — AÇÕES COMERCIAIS — provisório H-A
-- ===========================================================================
create type public.tipo_acao as enum ('ligacao', 'mensagem', 'visita', 'proposta', 'follow_up', 'outro');
create type public.situacao_acao as enum ('planejada', 'realizada', 'cancelada');

create table public.acoes_venda (
  id                   uuid primary key default gen_random_uuid(),
  cliente_id           uuid not null references public.clientes (id) on delete restrict,
  negociacao_id        uuid references public.negociacoes (id) on delete restrict,
  vendedor_id          uuid not null default auth.uid() references public.perfis (id),
  tipo                 public.tipo_acao not null,
  situacao             public.situacao_acao not null default 'planejada',
  data_prevista        date,
  data_realizada       date,
  descricao            text not null check (length(trim(descricao)) between 1 and 2000),
  resultado            text,
  motivo_cancelamento  text,
  criado_em            timestamptz not null default now(),
  atualizado_em        timestamptz not null default now(),

  constraint acoes_planejada_exige_data_prevista
    check (situacao <> 'planejada' or data_prevista is not null),
  constraint acoes_realizada_exige_data_realizada
    check (situacao <> 'realizada' or data_realizada is not null),
  constraint acoes_cancelada_exige_motivo
    check (situacao <> 'cancelada' or nullif(trim(coalesce(motivo_cancelamento, '')), '') is not null)
);
comment on table public.acoes_venda is
  'Ações comerciais (ligação, visita, proposta…) do vendedor responsável pelo cliente. Provisório H-A.';
comment on column public.acoes_venda.vendedor_id is 'Responsável pela ação: sempre o dono do cliente.';
create index acoes_cliente_idx on public.acoes_venda (cliente_id);
create index acoes_negociacao_idx on public.acoes_venda (negociacao_id) where negociacao_id is not null;
create index acoes_vendedor_idx on public.acoes_venda (vendedor_id);
create index acoes_data_prevista_idx on public.acoes_venda (data_prevista);
create index acoes_data_realizada_idx on public.acoes_venda (data_realizada) where situacao = 'realizada';

-- Responsável = dono do cliente; negociação (se houver) do mesmo cliente.
-- SECURITY DEFINER para ler cliente/negociação sem depender da RLS.
create function public.validar_acao_venda()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  dono uuid;
  cliente_da_negociacao uuid;
begin
  select c.vendedor_id into dono from public.clientes c where c.id = new.cliente_id;
  if dono is distinct from new.vendedor_id then
    raise exception 'A ação deve pertencer ao vendedor responsável pelo cliente.'
      using errcode = '42501';
  end if;
  if new.negociacao_id is not null then
    select n.cliente_id into cliente_da_negociacao from public.negociacoes n where n.id = new.negociacao_id;
    if cliente_da_negociacao is distinct from new.cliente_id then
      raise exception 'A negociação da ação deve ser do mesmo cliente.'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger acoes_vendedor_e_negociacao
  before insert on public.acoes_venda
  for each row execute function public.validar_acao_venda();

-- Cliente, negociação e responsável não mudam depois de criados.
create function public.proteger_acao_imutavel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.cliente_id is distinct from old.cliente_id
     or new.negociacao_id is distinct from old.negociacao_id
     or new.vendedor_id is distinct from old.vendedor_id then
    raise exception 'Cliente, negociação e responsável de uma ação não podem ser alterados.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger acoes_campos_imutaveis
  before update on public.acoes_venda
  for each row execute function public.proteger_acao_imutavel();

create trigger acoes_atualizado_em
  before update on public.acoes_venda
  for each row execute function public.tocar_atualizado_em();

-- Histórico de ações (mesmo padrão de historico_negociacoes).
create table public.historico_acoes (
  id              bigint generated always as identity primary key,
  acao_id         uuid not null references public.acoes_venda (id) on delete cascade,
  alterado_por    uuid references public.perfis (id),
  alterado_em     timestamptz not null default now(),
  campo           text not null,
  valor_anterior  text,
  valor_novo      text
);
create index historico_acoes_idx on public.historico_acoes (acao_id, alterado_em);

create function public.registrar_historico_acao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  quem uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    insert into public.historico_acoes (acao_id, alterado_por, campo, valor_anterior, valor_novo)
    values (new.id, quem, 'criada', null, new.situacao::text);
    return new;
  end if;

  insert into public.historico_acoes (acao_id, alterado_por, campo, valor_anterior, valor_novo)
  select new.id, quem, mudanca.campo, mudanca.antes, mudanca.depois
  from (values
    ('situacao',       old.situacao::text,       new.situacao::text),
    ('data_prevista',  old.data_prevista::text,  new.data_prevista::text),
    ('data_realizada', old.data_realizada::text, new.data_realizada::text)
  ) as mudanca (campo, antes, depois)
  where mudanca.antes is distinct from mudanca.depois;

  return new;
end;
$$;

create trigger acoes_historico
  after insert or update on public.acoes_venda
  for each row execute function public.registrar_historico_acao();

create view public.vw_acoes
with (security_invoker = true)
as
select
  a.id,
  a.cliente_id,
  c.nome as cliente_nome,
  a.negociacao_id,
  case when a.negociacao_id is not null then s.nome || ' · ' || u.nome end as negociacao_rotulo,
  a.vendedor_id,
  p.nome as vendedor_nome,
  a.tipo,
  a.situacao,
  a.data_prevista,
  a.data_realizada,
  a.descricao,
  a.resultado,
  a.motivo_cancelamento,
  a.criado_em,
  a.atualizado_em
from public.acoes_venda a
join public.clientes c on c.id = a.cliente_id
join public.perfis   p on p.id = a.vendedor_id
left join public.negociacoes n on n.id = a.negociacao_id
left join public.servicos    s on s.id = n.servico_id
left join public.unidades    u on u.id = n.unidade_id;

-- Ações do mês: realizadas pela data realizada; planejadas e canceladas pela data prevista.
create function public.acoes_mes(p_ano int, p_mes int)
returns setof public.vw_acoes
language sql
stable
security invoker
set search_path = ''
as $$
  with periodo as (
    select make_date(p_ano, p_mes, 1) as inicio,
           (make_date(p_ano, p_mes, 1) + interval '1 month')::date as fim
  )
  select v.*
  from public.vw_acoes v, periodo
  where (v.situacao = 'realizada'
         and v.data_realizada >= periodo.inicio and v.data_realizada < periodo.fim)
     or (v.situacao in ('planejada', 'cancelada')
         and v.data_prevista >= periodo.inicio and v.data_prevista < periodo.fim)
  order by coalesce(v.data_realizada, v.data_prevista), v.cliente_nome
$$;
revoke all on function public.acoes_mes(int, int) from public, anon;
grant execute on function public.acoes_mes(int, int) to authenticated;

-- ===========================================================================
-- M3 — CONVERSAS — provisório H-C
-- ===========================================================================
create type public.canal_conversa as enum ('whatsapp', 'instagram', 'telefone', 'email', 'presencial', 'outro');

create table public.conversas (
  id                     uuid primary key default gen_random_uuid(),
  cliente_id             uuid not null references public.clientes (id) on delete restrict,
  negociacao_id          uuid references public.negociacoes (id) on delete restrict,
  vendedor_id            uuid not null default auth.uid() references public.perfis (id),
  registrada_por         uuid not null default auth.uid() references public.perfis (id),
  canal                  public.canal_conversa not null,
  ocorrida_em            timestamptz not null,
  conteudo               text not null check (length(trim(conteudo)) > 0 and length(conteudo) <= 20000),
  substitui_conversa_id  uuid unique references public.conversas (id) on delete restrict,
  motivo_correcao        text,
  criado_em              timestamptz not null default now(),

  constraint conversas_correcao_exige_motivo
    check (substitui_conversa_id is null or nullif(trim(coalesce(motivo_correcao, '')), '') is not null),
  constraint conversas_nao_substitui_a_si
    check (substitui_conversa_id is distinct from id)
);
comment on table public.conversas is
  'Registro imutável de conversas. Correção = nova linha com substitui_conversa_id (cada versão só é substituída uma vez). Provisório H-C.';
create index conversas_cliente_idx on public.conversas (cliente_id);
create index conversas_vendedor_idx on public.conversas (vendedor_id);
create index conversas_ocorrida_idx on public.conversas (ocorrida_em);

-- Vendedor = dono do cliente; negociação do mesmo cliente; correção com o
-- mesmo cliente e o mesmo vendedor da original.
create function public.validar_conversa()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  dono uuid;
  cliente_da_negociacao uuid;
  original record;
begin
  select c.vendedor_id into dono from public.clientes c where c.id = new.cliente_id;
  if dono is distinct from new.vendedor_id then
    raise exception 'A conversa deve pertencer ao vendedor responsável pelo cliente.'
      using errcode = '42501';
  end if;
  if new.negociacao_id is not null then
    select n.cliente_id into cliente_da_negociacao from public.negociacoes n where n.id = new.negociacao_id;
    if cliente_da_negociacao is distinct from new.cliente_id then
      raise exception 'A negociação da conversa deve ser do mesmo cliente.'
        using errcode = '23514';
    end if;
  end if;
  if new.substitui_conversa_id is not null then
    select o.cliente_id, o.vendedor_id into original
    from public.conversas o where o.id = new.substitui_conversa_id;
    if not found
       or original.cliente_id is distinct from new.cliente_id
       or original.vendedor_id is distinct from new.vendedor_id then
      raise exception 'A correção deve ter o mesmo cliente e o mesmo vendedor da conversa original.'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger conversas_validar
  before insert on public.conversas
  for each row execute function public.validar_conversa();

-- versao_atual: ninguém a substitui; foi_corrigida: esta versão corrige uma anterior.
create view public.vw_conversas
with (security_invoker = true)
as
select
  k.id,
  k.cliente_id,
  c.nome as cliente_nome,
  k.negociacao_id,
  k.vendedor_id,
  p.nome as vendedor_nome,
  k.registrada_por,
  k.canal,
  k.ocorrida_em,
  k.conteudo,
  k.substitui_conversa_id,
  k.motivo_correcao,
  k.criado_em,
  not exists (select 1 from public.conversas x where x.substitui_conversa_id = k.id) as versao_atual,
  (k.substitui_conversa_id is not null) as foi_corrigida
from public.conversas k
join public.clientes c on c.id = k.cliente_id
join public.perfis   p on p.id = k.vendedor_id;

create table public.analises_conversa (
  id           uuid primary key default gen_random_uuid(),
  conversa_id  uuid not null references public.conversas (id) on delete restrict,
  gestora_id   uuid not null default auth.uid() references public.perfis (id),
  comentario   text not null check (length(trim(comentario)) between 1 and 5000),
  criado_em    timestamptz not null default now()
);
comment on table public.analises_conversa is 'Análise da gestora sobre uma conversa. Invisível ao vendedor. Provisório H-C.';
create index analises_conversa_idx on public.analises_conversa (conversa_id);

-- ===========================================================================
-- Permissões e RLS
-- ===========================================================================
revoke all on public.acoes_venda, public.historico_acoes, public.vw_acoes,
              public.conversas, public.vw_conversas, public.analises_conversa
  from anon;
-- Registros imutáveis / sem exclusão: reforço além da RLS.
revoke update, delete, truncate on public.conversas, public.analises_conversa, public.historico_acoes
  from authenticated;
revoke delete, truncate on public.acoes_venda from authenticated;

alter table public.acoes_venda       enable row level security;
alter table public.historico_acoes   enable row level security;
alter table public.conversas         enable row level security;
alter table public.analises_conversa enable row level security;

-- ações: igual às negociações
create policy acoes_select on public.acoes_venda
  for select to authenticated
  using (
    (vendedor_id = (select auth.uid()) and (select public.perfil_atual()) = 'vendedor')
    or (select public.perfil_atual()) = 'gestor'
  );
create policy acoes_vendedor_insert on public.acoes_venda
  for insert to authenticated
  with check (vendedor_id = (select auth.uid()) and (select public.perfil_atual()) = 'vendedor');
create policy acoes_vendedor_update on public.acoes_venda
  for update to authenticated
  using (vendedor_id = (select auth.uid()) and (select public.perfil_atual()) = 'vendedor')
  with check (vendedor_id = (select auth.uid()) and (select public.perfil_atual()) = 'vendedor');

create policy historico_acoes_select on public.historico_acoes
  for select to authenticated
  using (
    (select public.perfil_atual()) = 'gestor'
    or exists (
      select 1 from public.acoes_venda a
      where a.id = acao_id and a.vendedor_id = (select auth.uid())
    )
  );

-- conversas: vendedor lê e cria as próprias; gestora lê todas e não cria.
create policy conversas_select on public.conversas
  for select to authenticated
  using (
    (vendedor_id = (select auth.uid()) and (select public.perfil_atual()) = 'vendedor')
    or (select public.perfil_atual()) = 'gestor'
  );
create policy conversas_vendedor_insert on public.conversas
  for insert to authenticated
  with check (
    vendedor_id = (select auth.uid())
    and registrada_por = (select auth.uid())
    and (select public.perfil_atual()) = 'vendedor'
  );

-- análises: só a gestora lê e insere.
create policy analises_gestora_select on public.analises_conversa
  for select to authenticated
  using ((select public.perfil_atual()) = 'gestor');
create policy analises_gestora_insert on public.analises_conversa
  for insert to authenticated
  with check (gestora_id = (select auth.uid()) and (select public.perfil_atual()) = 'gestor');

-- Sem políticas de DELETE (e sem UPDATE em conversas e análises).
