# Registro de orquestração

Registro cronológico de comandos reais do Orca, recibos, medições de memória, entregas e merges.

| Horário | Evento | Evidência |
|---|---|---|
| 13/11 | Docs commitados | `4d3a2cf` |
| 13/11 | M0 commitado (wrapper por slot, `E2E_PORT`) | `050e799`; slot 0: 25/25 testes de banco |
| 13/11 | 4 worktrees criadas por `orca worktree create --base-branch … --branch crm/<x> --parent-worktree active --setup skip --json` | `ok:true` nas 4; HEAD `050e799` |
| 13/11 | Memória: ≈1,7 GB livre+inativa (8 GB total). Slot 0 parado temporariamente para liberar memória | `vm_stat` |
| 13/11 | Preparo A (slot 1, 546xx) e C (slot 3, 548xx): `npm ci` + `ambiente:isolado` | containers `crm-veronica-s1` e `-s3` |
| 13/11 | **QA-M0-2 aprovado**: `db:reset` + unitários + testes de banco **simultâneos** em s1 e s3 → 15/15 e 25/25 em cada; bancos independentes (4 clientes cada) | logs `iso-*.log` |
| 13/11 | Run `run_a188caed0a5f` criado. **A1** iniciado: `orca orchestration worker-start --spec-file docs/plans/briefs/A1.md --worktree id:…::…/crm-a-backend --agent claude` | task `task_08504d03e438`, dispatch `ctx_d7e5558b9c0b`, `state: ready`, liveness `live` |
| 13/11 | **C1** iniciado (mesmo comando, worktree `crm-c-fluxos`) | task `task_7183456b6dd8`, dispatch `ctx_73c035166307`, `live` |
| 13/11 | Conferência única via `worker-read`: ambos trabalhando, sem pedido de permissão pendente | transcrições |
| 13/11 | B e D aguardam (limite de 2 tarefas pesadas). Worktrees criadas, sem `npm ci` nem pilha ainda | — |
| 13/11 | **C1 entregue** (`6ec73f2`, worker_done). Revisão: arquivos dentro do escopo; diff ok; ressalva: CSV sem 2 casas (vai no C2) | `docs/reports/c-C1.md` |
| 13/11 | **Merge C1** → `59cd5ed`. Gates no slot 0: typecheck/lint ok; unit 20/20; db 25/25; e2e 8/8. Verificação funcional no navegador AC-M4-1..5 e AC-M5-1..5: 11/11 PASS; dados restaurados | logs `i1c.log`, script `scratchpad/i1/m4m5.mjs` |
| 13/11 | Memória: swap 4,2/5 GB. Paradas pilhas ociosas (s3, slot 0). D preparado (slot 4) mas **não lançado** para respeitar o limite de 2 tarefas pesadas | `vm_stat`, `sysctl vm.swapusage` |
| 13/11 | **A1 entregue** (`8f1f3da` + `f76db5d`, worker_done). Revisão: só arquivos de A; migração aditiva (sem DROP/TRUNCATE/DELETE); RLS ativa nas 4 tabelas novas; views `security_invoker`; definers com `search_path=''`; `anon` revogado | `docs/reports/a-A1.md` |
| 13/11 | **Merge A1** → `dd17d3c`. Gates no slot 0: typecheck/lint/build ok; unit 20/20; db 42/42; e2e 8/8 | log `i1a.log` |
| 13/11 | **I1 concluída.** Briefs B2/C2 → `9809189`. Branches B e C avançadas (ff) para a integração; B preparado (slot 2), C religado (slot 3); pilhas s1, s4 e slot 0 paradas | — |
| 13/11 | **B2** iniciado (worktree `crm-b-frontend`) e **C2** iniciado (`crm-c-fluxos`) | B2: task `task_6c6619f60afe`, dispatch `ctx_1511b70184b1`; C2: task `task_a005588f261b`, dispatch `ctx_ca0f9332cea1`; ambos `ready` |
| 13/11 | **C2 entregue** (`05f08c4`, `c8216e7`). Revisão: arquivos dentro do escopo; `registrarExecucao` reconfere dono/perfil/status e filtra o UPDATE; painel 404 para vendedor. Ponto comercial novo: atrasadas de meses anteriores (decisão 15) | `docs/reports/c-C2.md` |
| 13/11 | **Merge C2** → `48d0284`. Gates: build ok; unit 26/26; db 42/42; e2e 8/8 | `i2c.log` |
| 13/11 | **B2 entregue** (`722ff08`, `4e4065a`). Revisão: só arquivos novos de B; conversas sem UPDATE/DELETE; análise só gestora (ação e consulta) | `docs/reports/b-B2.md` |
| 13/11 | **Merge B2** → `c0c6555`. **I2 (coordenador):** menu (Painel/Ações/Conversas/Vendas/Execução), gestora → `/painel`, `ProximasAcoes` + `ConversasCliente` na ficha; asserção de `demonstracao.spec.ts` `/relatorio$`→`/painel$` (D ocioso, sem concorrência) | — |
| 13/11 | Gates I2: typecheck/lint/build ok; unit 38/38; db 42/42; e2e 8/8. Varredura de telas por perfil no build de produção: 36/36 (200/404 esperados), 0 erros de JS | `i2.log`, `scratchpad/i2/varredura.mjs` |
| 13/11 | I2 commitada (`0697b59`). Slot 0 parado; D avançado (ff) para `0697b59`, slot 4 com as 3 migrações | — |
| 13/11 | **D2** iniciado (QA independente M1–M6 + segurança + responsividade) | task `task_d232e5bb385d`, dispatch `ctx_b384b07cf2a3`, `ready` |
| 13/11 | README reescrito (situação, regras provisórias H-E/H-A/H-C, decisões 1–18, roteiro de demonstração completo). Números do roteiro a conferir na I3 | — |
| 13/11 | **D2 entregue** (`d5a1ca1`): todos os AC-M1..M6 PASSOU; QA-1 e QA-3 PASSOU; QA-2 com ressalva; QA-4 FALHOU em 390 px; 5 defeitos P2; D-01 reavaliado sem risco de acesso (RLS bloqueia tudo). `npm test` no slot 4: unit 38, banco 57, e2e 42 (2 `test.fail`) | `docs/qa/relatorio-qa.md` |
| 13/11 | **Merge D2** → `6bb992d`. Decisão do coordenador: D2-01 (dado incorreto no painel→lista) e D2-02 (responsividade) tratados como obrigatórios (critérios de conclusão); D2-03/04/05 entram na mesma rodada | — |
| 13/11 | **W3** por `orca orchestration send` (follow-up com contexto): B → D2-01/02(ações)/03/05; C → D2-02 (painel e relatórios); A → D2-04 (migração aditiva `revoke execute`) | B `ctx_dfe8d1744208`, C `ctx_090b206c9f6a`, A `ctx_635436775414`; todos `reopened`/`ready` |
