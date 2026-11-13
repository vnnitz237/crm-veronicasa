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

-- ---------------------------------------------------------------------------
-- M1 — Execuções (provisório H-E)
--   d…001 (Marcos) e d…005 (Juliana) ficam pendentes (gatilho);
--   d…004 (Juliana) foi realizada em 20/10/2026.
-- ---------------------------------------------------------------------------
update public.negociacoes
   set status_execucao = 'realizada', data_execucao_realizada = '2026-10-20'
 where id = 'd1000000-0000-4000-8000-000000000004';

-- ---------------------------------------------------------------------------
-- M2 — Ações comerciais (provisório H-A)
-- ---------------------------------------------------------------------------
insert into public.acoes_venda
  (id, cliente_id, negociacao_id, vendedor_id, tipo, situacao, data_prevista, data_realizada, descricao, resultado, motivo_cancelamento)
values
  -- Paula
  ('e1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001',
   '11111111-1111-4111-8111-111111111111', 'ligacao', 'realizada', '2026-10-25', '2026-10-25',
   'Ligar para confirmar o interesse no pacote mensal.', 'Cliente confirmou e pediu proposta.', null),
  ('e1000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000001', null,
   '11111111-1111-4111-8111-111111111111', 'follow_up', 'planejada', '2026-11-18', null,
   'Acompanhar a satisfação após a primeira sessão.', null, null),
  ('e1000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000003',
   '11111111-1111-4111-8111-111111111111', 'visita', 'planejada', '2026-11-20', null,
   'Visita para apresentar a consultoria inicial.', null, null),
  -- Rafael
  ('e1000000-0000-4000-8000-000000000004', 'c1000000-0000-4000-8000-000000000003', 'd1000000-0000-4000-8000-000000000005',
   '22222222-2222-4222-8222-222222222222', 'proposta', 'realizada', '2026-11-02', '2026-11-02',
   'Enviar proposta do pacote mensal.', 'Proposta aceita.', null),
  ('e1000000-0000-4000-8000-000000000005', 'c1000000-0000-4000-8000-000000000004', null,
   '22222222-2222-4222-8222-222222222222', 'mensagem', 'cancelada', '2026-11-05', null,
   'Mensagem com opções de horário.', null, 'Cliente pediu contato só em dezembro.'),
  ('e1000000-0000-4000-8000-000000000006', 'c1000000-0000-4000-8000-000000000004', 'd1000000-0000-4000-8000-000000000006',
   '22222222-2222-4222-8222-222222222222', 'visita', 'planejada', '2026-11-25', null,
   'Visita à Unidade Norte para a avaliação.', null, null);

-- ---------------------------------------------------------------------------
-- M3 — Conversas e análise (provisório H-C)
--   f…001 (Paula/Marcos) foi corrigida por f…002; f…003 (Rafael/Juliana).
-- ---------------------------------------------------------------------------
insert into public.conversas
  (id, cliente_id, negociacao_id, vendedor_id, registrada_por, canal, ocorrida_em, conteudo, substitui_conversa_id, motivo_correcao, criado_em)
values
  ('f1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001',
   '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'whatsapp', '2026-10-27 14:00-03',
   'Marcos perguntou sobre horários do pacote mensal.', null, null, '2026-10-27 14:30-03'),
  ('f1000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001',
   '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'whatsapp', '2026-10-27 14:00-03',
   'Marcos perguntou sobre horários e formas de pagamento do pacote mensal.',
   'f1000000-0000-4000-8000-000000000001', 'Faltou registrar a dúvida sobre pagamento.', '2026-10-27 15:00-03'),
  ('f1000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000003', 'd1000000-0000-4000-8000-000000000005',
   '22222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', 'telefone', '2026-11-02 10:00-03',
   'Juliana aceitou a proposta por telefone.', null, null, '2026-11-02 10:20-03');

insert into public.analises_conversa (id, conversa_id, gestora_id, comentario) values
  ('f2000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000003',
   '33333333-3333-4333-8333-333333333333', 'Boa condução: confirmou valor e data antes do aceite.');
