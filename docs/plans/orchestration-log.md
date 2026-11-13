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
