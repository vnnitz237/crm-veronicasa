# Relatório A1 — Contrato de dados M1 + M2 + M3 (Agente A)

## 1. Arquivos
- `supabase/migrations/20261113100000_execucao_acoes_conversas.sql` (nova, aditiva)
- `supabase/seed.sql` (apenas acréscimos no fim; nenhum cliente novo, dados existentes intactos)
- `src/lib/supabase/database.types.ts` (regenerado por `npm run db:types`)
- `tests/integracao/a-contrato.test.ts` (novo)
- `docs/reports/a-A1.md`

## 2. Funcionalidades
**M1 — Execuções (H-E):** enum `status_execucao`; colunas `status_execucao`, `data_execucao_realizada`, `motivo_cancelamento_execucao` em `negociacoes`; gatilho `negociacoes_execucao_coerente` (fechou ⇒ `pendente` se nulo; fora de fechou ⇒ limpa os três); restrições (`execucao_so_se_fechou`, `realizada ⇔ data`, `data realizada ≥ data_venda`, `cancelada ⇔ motivo não vazio`); *backfill* `pendente` para fechadas; histórico ampliado (create or replace); `vw_negociacoes` com as 3 colunas no fim; `negociacoes_execucao_mes(ano, mes)` (invoker).
**M2 — Ações (H-A):** enums `tipo_acao`, `situacao_acao`; `acoes_venda` com restrições (planejada ⇒ data prevista; realizada ⇒ data realizada; cancelada ⇒ motivo; descrição 1–2000); gatilhos: responsável = dono do cliente e negociação do mesmo cliente (insert), cliente/negociação/responsável imutáveis, `atualizado_em`; `historico_acoes` (criação, situação, datas); `vw_acoes` (`cliente_nome`, `vendedor_nome`, `negociacao_rotulo` "serviço · unidade"); `acoes_mes(ano, mes)`; RLS igual a negociações, sem DELETE.
**M3 — Conversas (H-C):** enum `canal_conversa`; `conversas` imutável (sem UPDATE/DELETE; `revoke update, delete` também), correção via `substitui_conversa_id` UNIQUE + motivo obrigatório; gatilho valida dono do cliente, negociação do mesmo cliente e correção com mesmo cliente/vendedor da original; `vw_conversas` com `versao_atual` e `foi_corrigida`; `analises_conversa` (só gestora lê/insere, `gestora_id = auth.uid()`). Gestora não cria conversa; vendedor insere só com `vendedor_id = registrada_por = auth.uid()`.
**Permissões:** `revoke all ... from anon` nas tabelas/visões novas; `execute` das funções só para `authenticated`.

**Seed:** d…004 realizada em 20/10/2026; d…001 (prev. 04/11) e d…005 (prev. 10/11) pendentes. 6 ações (`e1…001–006`): Paula 1 realizada out, 2 planejadas nov; Rafael 1 realizada nov, 1 cancelada (prev. 05/11), 1 planejada nov. 3 conversas (`f1…001` corrigida por `f1…002`; `f1…003` Rafael/Juliana) e 1 análise (`f2…001`).

## 3. Testes
`npm run db:reset && npm run typecheck && npm run lint && npm run test:unit && npm run test:db`
- typecheck: ok · lint: ok · unit: 15/15 · db: 42/42 (25 existentes + 17 novos). Suíte de banco também passa uma 2ª vez sem reset (testes limpam o que criam).
- Nenhum teste existente precisou de ajuste.

## 4. Riscos e decisões de interpretação
- `foi_corrigida` = "esta versão é uma correção" (`substitui_conversa_id is not null`); a original substituída tem `versao_atual = false`. Se a intenção for outra, ajuste simples na visão (A2).
- Mudar `status_execucao` para nulo numa negociação fechada é aceito e volta a `pendente` (gatilho), em vez de erro.
- Em ações, o motivo de cancelamento é só **obrigatório** se cancelada (não é proibido nas outras situações); `data_realizada` não é exigida nula fora de `realizada` — a especificação não diz. Em execução (M1) a regra "nulo nos outros status" foi aplicada como escrita.
- `conversas.vendedor_id` tem padrão `auth.uid()` (a especificação não definia padrão).
- Sem bloqueios.

## 5. Commit
Ver `git log` — `[A1] Contrato de dados: execuções, ações e conversas`.
