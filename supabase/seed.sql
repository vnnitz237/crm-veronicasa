-- Dados FICTÍCIOS para demonstração e testes locais. Nenhum dado real.
-- Senha de todos os usuários de demonstração: demo-crm-2026

-- ---------------------------------------------------------------------------
-- Usuários (auth) — 2 vendedores e 1 gestora
-- ---------------------------------------------------------------------------
with novos (id, email, nome) as (
  values
    ('11111111-1111-4111-8111-111111111111'::uuid, 'paula@exemplo.test',    'Paula Lima'),
    ('22222222-2222-4222-8222-222222222222'::uuid, 'rafael@exemplo.test',   'Rafael Souza'),
    ('33333333-3333-4333-8333-333333333333'::uuid, 'veronica@exemplo.test', 'Verônica Sá')
)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
  extensions.crypt('demo-crm-2026', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', jsonb_build_object('nome', nome), now(), now(),
  '', '', '', ''
from novos;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users u
where u.email in ('paula@exemplo.test', 'rafael@exemplo.test', 'veronica@exemplo.test');

insert into public.perfis (id, nome, perfil) values
  ('11111111-1111-4111-8111-111111111111', 'Paula Lima',   'vendedor'),
  ('22222222-2222-4222-8222-222222222222', 'Rafael Souza', 'vendedor'),
  ('33333333-3333-4333-8333-333333333333', 'Verônica Sá',  'gestor');

-- ---------------------------------------------------------------------------
-- Cadastros básicos
-- ---------------------------------------------------------------------------
insert into public.unidades (id, nome) values
  ('a1000000-0000-4000-8000-000000000001', 'Unidade Centro'),
  ('a1000000-0000-4000-8000-000000000002', 'Unidade Norte'),
  ('a1000000-0000-4000-8000-000000000003', 'Unidade Sul');

insert into public.servicos (id, nome) values
  ('b1000000-0000-4000-8000-000000000001', 'Pacote Mensal'),
  ('b1000000-0000-4000-8000-000000000002', 'Avaliação Completa'),
  ('b1000000-0000-4000-8000-000000000003', 'Consultoria Inicial');

-- ---------------------------------------------------------------------------
-- Clientes
-- ---------------------------------------------------------------------------
insert into public.clientes (id, nome, telefone, email, origem, vendedor_id) values
  -- da Paula
  ('c1000000-0000-4000-8000-000000000001', 'Marcos Teixeira', '11900000001', 'marcos@exemplo.test',  'Instagram',  '11111111-1111-4111-8111-111111111111'),
  ('c1000000-0000-4000-8000-000000000002', 'Beatriz Campos',  '11900000002', null,                   'Indicação',  '11111111-1111-4111-8111-111111111111'),
  -- do Rafael
  ('c1000000-0000-4000-8000-000000000003', 'Juliana Prado',   '11900000003', 'juliana@exemplo.test', 'WhatsApp',   '22222222-2222-4222-8222-222222222222'),
  ('c1000000-0000-4000-8000-000000000004', 'Carlos Mendes',   '11900000004', null,                   'Site',       '22222222-2222-4222-8222-222222222222');

-- ---------------------------------------------------------------------------
-- Negociações
-- ---------------------------------------------------------------------------
insert into public.negociacoes
  (id, cliente_id, vendedor_id, servico_id, unidade_id, valor, status, data_venda, data_perda, motivo_perda, data_execucao_prevista)
values
  -- Marcos (Paula): duas negociações com resultados diferentes
  ('d1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
   'b1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 1200.00, 'fechou',
   '2026-10-28', null, null, '2026-11-04'),
  ('d1000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
   'b1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', 350.00, 'nao_fechou',
   null, '2026-10-30', 'Preço', null),
  -- Beatriz (Paula): ainda em negociação
  ('d1000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111',
   'b1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', 500.00, 'em_negociacao',
   null, null, null, null),
  -- Juliana (Rafael): fechada em outubro e outra fechada em novembro
  ('d1000000-0000-4000-8000-000000000004', 'c1000000-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222',
   'b1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', 800.00, 'fechou',
   '2026-10-15', null, null, '2026-10-20'),
  ('d1000000-0000-4000-8000-000000000005', 'c1000000-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222',
   'b1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002', 1200.00, 'fechou',
   '2026-11-03', null, null, '2026-11-10'),
  -- Carlos (Rafael): em negociação
  ('d1000000-0000-4000-8000-000000000006', 'c1000000-0000-4000-8000-000000000004', '22222222-2222-4222-8222-222222222222',
   'b1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', 350.00, 'em_negociacao',
   null, null, null, null);
