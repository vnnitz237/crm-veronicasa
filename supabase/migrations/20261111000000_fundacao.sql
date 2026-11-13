-- CRM Verônica Sá — fundação do MVP
-- Perfis, cadastros básicos, clientes, negociações, histórico e regras de acesso (RLS).
--
-- Regras centrais:
--   * A venda é a NEGOCIAÇÃO (1 serviço + 1 unidade). Um cliente pode ter várias.
--   * Vendedor: cria, vê e edita só os próprios clientes e negociações.
--   * Gestor: vê tudo, não edita registros dos vendedores (somente leitura no MVP).
--   * Ninguém exclui clientes ou negociações pela aplicação.

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type public.perfil_usuario as enum ('vendedor', 'gestor');
create type public.status_negociacao as enum ('em_negociacao', 'fechou', 'nao_fechou');

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------
create table public.perfis (
  id         uuid primary key references auth.users (id) on delete cascade,
  nome       text not null check (length(trim(nome)) > 0),
  perfil     public.perfil_usuario not null,
  ativo      boolean not null default true,
  criado_em  timestamptz not null default now()
);
comment on table public.perfis is 'Perfil de acesso de cada usuário. Criado pela administração, nunca pelo próprio usuário.';

create table public.unidades (
  id     uuid primary key default gen_random_uuid(),
  nome   text not null unique check (length(trim(nome)) > 0),
  ativa  boolean not null default true
);

create table public.servicos (
  id     uuid primary key default gen_random_uuid(),
  nome   text not null unique check (length(trim(nome)) > 0),
  ativo  boolean not null default true
);

create table public.clientes (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null check (length(trim(nome)) between 2 and 200),
  -- somente dígitos (DDD + número), normalizado pela aplicação
  telefone       text not null check (telefone ~ '^[0-9]{10,13}$'),
  email          text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  origem         text,
  observacoes    text,
  vendedor_id    uuid not null default auth.uid() references public.perfis (id),
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  constraint clientes_telefone_unico unique (telefone)
);
create index clientes_vendedor_idx on public.clientes (vendedor_id);

create table public.negociacoes (
  id                      uuid primary key default gen_random_uuid(),
  cliente_id              uuid not null references public.clientes (id) on delete restrict,
  vendedor_id             uuid not null default auth.uid() references public.perfis (id),
  servico_id              uuid not null references public.servicos (id),
  unidade_id              uuid not null references public.unidades (id),
  valor                   numeric(12, 2) not null check (valor >= 0),
  status                  public.status_negociacao not null default 'em_negociacao',
  data_venda              date,
  data_perda              date,
  motivo_perda            text,
  data_execucao_prevista  date,
  criado_em               timestamptz not null default now(),
  atualizado_em           timestamptz not null default now(),

  -- "fechou" exige data da venda; a data da venda só existe se fechou
  constraint negociacoes_fechou_exige_data_venda
    check ((status = 'fechou') = (data_venda is not null)),
  -- "não fechou" exige data e motivo; esses campos só existem se não fechou
  constraint negociacoes_perda_exige_data_e_motivo
    check (
      (status = 'nao_fechou') = (data_perda is not null)
      and (status = 'nao_fechou') = (nullif(trim(coalesce(motivo_perda, '')), '') is not null)
    ),
  -- execução não pode ser prevista para antes da venda
  constraint negociacoes_execucao_apos_venda
    check (data_execucao_prevista is null or data_venda is null or data_execucao_prevista >= data_venda)
);
create index negociacoes_cliente_idx on public.negociacoes (cliente_id);
create index negociacoes_vendedor_idx on public.negociacoes (vendedor_id);
create index negociacoes_data_venda_idx on public.negociacoes (data_venda) where status = 'fechou';
create index negociacoes_data_perda_idx on public.negociacoes (data_perda) where status = 'nao_fechou';

create table public.historico_negociacoes (
  id              bigint generated always as identity primary key,
  negociacao_id   uuid not null references public.negociacoes (id) on delete cascade,
  alterado_por    uuid references public.perfis (id),
  alterado_em     timestamptz not null default now(),
  campo           text not null,
  valor_anterior  text,
  valor_novo      text
);
create index historico_negociacao_idx on public.historico_negociacoes (negociacao_id, alterado_em);

-- ---------------------------------------------------------------------------
-- Funções auxiliares
-- ---------------------------------------------------------------------------

-- Perfil do usuário logado. SECURITY DEFINER evita recursão de RLS em "perfis".
create function public.perfil_atual()
returns public.perfil_usuario
language sql
stable
security definer
set search_path = ''
as $$
  select p.perfil from public.perfis p where p.id = auth.uid() and p.ativo
$$;
revoke all on function public.perfil_atual() from public, anon;
grant execute on function public.perfil_atual() to authenticated;

create function public.tocar_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger clientes_atualizado_em
  before update on public.clientes
  for each row execute function public.tocar_atualizado_em();

create trigger negociacoes_atualizado_em
  before update on public.negociacoes
  for each row execute function public.tocar_atualizado_em();

-- Impede trocar o dono de um cliente ou mover uma negociação de cliente/vendedor.
create function public.proteger_campos_imutaveis()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'clientes' then
    if new.vendedor_id is distinct from old.vendedor_id then
      raise exception 'O vendedor responsável pelo cliente não pode ser alterado por aqui.'
        using errcode = '42501';
    end if;
  elsif tg_table_name = 'negociacoes' then
    if new.vendedor_id is distinct from old.vendedor_id
       or new.cliente_id is distinct from old.cliente_id then
      raise exception 'Cliente e vendedor de uma negociação não podem ser alterados.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger clientes_campos_imutaveis
  before update on public.clientes
  for each row execute function public.proteger_campos_imutaveis();

create trigger negociacoes_campos_imutaveis
  before update on public.negociacoes
  for each row execute function public.proteger_campos_imutaveis();

-- A negociação pertence ao mesmo vendedor do cliente.
create function public.validar_vendedor_negociacao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  dono uuid;
begin
  select c.vendedor_id into dono from public.clientes c where c.id = new.cliente_id;
  if dono is distinct from new.vendedor_id then
    raise exception 'A negociação deve pertencer ao vendedor responsável pelo cliente.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger negociacoes_vendedor_do_cliente
  before insert on public.negociacoes
  for each row execute function public.validar_vendedor_negociacao();

-- Histórico de criação e de mudanças relevantes.
create function public.registrar_historico_negociacao()
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
    ('status',                 old.status::text,                 new.status::text),
    ('valor',                  old.valor::text,                  new.valor::text),
    ('servico_id',             old.servico_id::text,             new.servico_id::text),
    ('unidade_id',             old.unidade_id::text,             new.unidade_id::text),
    ('data_venda',             old.data_venda::text,             new.data_venda::text),
    ('data_perda',             old.data_perda::text,             new.data_perda::text),
    ('motivo_perda',           old.motivo_perda,                 new.motivo_perda),
    ('data_execucao_prevista', old.data_execucao_prevista::text, new.data_execucao_prevista::text)
  ) as mudanca (campo, antes, depois)
  where mudanca.antes is distinct from mudanca.depois;

  return new;
end;
$$;

create trigger negociacoes_historico
  after insert or update on public.negociacoes
  for each row execute function public.registrar_historico_negociacao();

-- ---------------------------------------------------------------------------
-- Visão de leitura (respeita RLS de quem consulta)
-- ---------------------------------------------------------------------------
create view public.vw_negociacoes
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
  n.atualizado_em
from public.negociacoes n
join public.clientes c on c.id = n.cliente_id
join public.perfis   p on p.id = n.vendedor_id
join public.servicos s on s.id = n.servico_id
join public.unidades u on u.id = n.unidade_id;

-- Negociações com RESULTADO no mês (hipótese provisória H3):
--   fechadas pela data da venda; perdidas pela data da perda.
-- SECURITY INVOKER: cada perfil só recebe o que a RLS já permite ver.
create function public.negociacoes_resultado_mes(p_ano int, p_mes int)
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
  where (v.status = 'fechou'     and v.data_venda >= periodo.inicio and v.data_venda < periodo.fim)
     or (v.status = 'nao_fechou' and v.data_perda >= periodo.inicio and v.data_perda < periodo.fim)
  order by coalesce(v.data_venda, v.data_perda), v.cliente_nome
$$;
revoke all on function public.negociacoes_resultado_mes(int, int) from public, anon;
grant execute on function public.negociacoes_resultado_mes(int, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Permissões e RLS
-- ---------------------------------------------------------------------------
revoke all on public.perfis, public.unidades, public.servicos, public.clientes,
              public.negociacoes, public.historico_negociacoes, public.vw_negociacoes
  from anon;

alter table public.perfis                enable row level security;
alter table public.unidades              enable row level security;
alter table public.servicos              enable row level security;
alter table public.clientes              enable row level security;
alter table public.negociacoes           enable row level security;
alter table public.historico_negociacoes enable row level security;

-- perfis: cada um vê o próprio; gestor vê todos. Sem escrita pela aplicação.
create policy perfis_select on public.perfis
  for select to authenticated
  using (id = (select auth.uid()) or (select public.perfil_atual()) = 'gestor');

-- unidades e serviços: leitura para todos os logados; manutenção pelo gestor.
create policy unidades_select on public.unidades
  for select to authenticated using ((select public.perfil_atual()) is not null);
create policy unidades_gestor_insert on public.unidades
  for insert to authenticated with check ((select public.perfil_atual()) = 'gestor');
create policy unidades_gestor_update on public.unidades
  for update to authenticated
  using ((select public.perfil_atual()) = 'gestor')
  with check ((select public.perfil_atual()) = 'gestor');

create policy servicos_select on public.servicos
  for select to authenticated using ((select public.perfil_atual()) is not null);
create policy servicos_gestor_insert on public.servicos
  for insert to authenticated with check ((select public.perfil_atual()) = 'gestor');
create policy servicos_gestor_update on public.servicos
  for update to authenticated
  using ((select public.perfil_atual()) = 'gestor')
  with check ((select public.perfil_atual()) = 'gestor');

-- clientes
create policy clientes_select on public.clientes
  for select to authenticated
  using (
    (vendedor_id = (select auth.uid()) and (select public.perfil_atual()) = 'vendedor')
    or (select public.perfil_atual()) = 'gestor'
  );
create policy clientes_vendedor_insert on public.clientes
  for insert to authenticated
  with check (vendedor_id = (select auth.uid()) and (select public.perfil_atual()) = 'vendedor');
create policy clientes_vendedor_update on public.clientes
  for update to authenticated
  using (vendedor_id = (select auth.uid()) and (select public.perfil_atual()) = 'vendedor')
  with check (vendedor_id = (select auth.uid()) and (select public.perfil_atual()) = 'vendedor');

-- negociações
create policy negociacoes_select on public.negociacoes
  for select to authenticated
  using (
    (vendedor_id = (select auth.uid()) and (select public.perfil_atual()) = 'vendedor')
    or (select public.perfil_atual()) = 'gestor'
  );
create policy negociacoes_vendedor_insert on public.negociacoes
  for insert to authenticated
  with check (vendedor_id = (select auth.uid()) and (select public.perfil_atual()) = 'vendedor');
create policy negociacoes_vendedor_update on public.negociacoes
  for update to authenticated
  using (vendedor_id = (select auth.uid()) and (select public.perfil_atual()) = 'vendedor')
  with check (vendedor_id = (select auth.uid()) and (select public.perfil_atual()) = 'vendedor');

-- histórico: leitura conforme a negociação; escrita apenas pelo gatilho.
create policy historico_select on public.historico_negociacoes
  for select to authenticated
  using (
    (select public.perfil_atual()) = 'gestor'
    or exists (
      select 1 from public.negociacoes n
      where n.id = negociacao_id and n.vendedor_id = (select auth.uid())
    )
  );

-- Sem políticas de DELETE: exclusão bloqueada para todos os perfis da aplicação.
