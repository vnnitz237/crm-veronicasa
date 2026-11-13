# Plano de execução — conclusão do CRM Verônica Sá

Situação: **aprovado com condições em 13/11/2026**. Escopo e contratos: `docs/specs/crm-completion.md`. Agentes e arquivos: `docs/plans/agent-ownership.md`. Aceite: `docs/qa/acceptance-criteria.md`. Registro operacional: `docs/plans/orchestration-log.md`.

## 1. Prioridades

**P0 — preparação e segurança**
- isolamento de bancos, portas e ambientes de teste (M0);
- MVP existente preservado (suíte completa verde a cada integração);
- contratos e regras registrados (esta pasta);
- funcionamento real das worktrees e dos agentes validado.

**P1 — entrega obrigatória**
- M5 edição de clientes · M4 CSV · M1 execuções e relatório de execução · M2 ações e relatório mensal · M3 conversas e análise · M6 painel gerencial mínimo;
- integração completa, testes e roteiro de demonstração.

**P2 — posterior**
- M7 configurações · paginação e filtros extras · melhorias visuais · M8 telefones em revisão (decisão 3);
- D-01 sessão de perfil inativo (fica em P2 enquanto não houver risco de acesso; o QA reavalia).

## 2. Caminho crítico

```
Docs ─► M0 ─► worktrees ─► A1 (contrato) ─► I1 ─► B2 (M2, M3) e C2 (M1, M6) ─► I2 ─► D2/D3 QA ─► I3 ─► demonstração
                         └► C1 (M5, M4) ──┘
```

## 3. Ondas

| Onda | Pesadas em paralelo | Tarefas | Condição de saída |
|---|---|---|---|
| W0 | coordenador | Docs (commit) · M0 *wrapper*, slots e `E2E_PORT` · validação | Slot 1 roda testes de banco sem tocar no slot 0 |
| W-setup | coordenador | 4 worktrees · `npm ci` · `.crm-slot` · pilhas só dos agentes ativos | Unitários e testes de banco verdes no slot do agente |
| W1 | **A1**, **C1** (D1 leve, se houver memória) | Contrato de dados · M5 · M4 | Relatórios entregues e testes do agente verdes |
| I1 | coordenador | Revisão dos diffs · merge `--no-ff` local · suíte completa no slot 0 | Tudo verde |
| W2 | **B2**, **C2** (D2 quando um terminar) | M2+M3 · M1+M6 · e2e | Relatórios e testes verdes |
| I2 | coordenador | Merge · monta os componentes na ficha do cliente e no menu · suíte completa | Tudo verde |
| W3 | **D3** (+ ajustes de B e C) | QA independente, RLS, responsividade, regressão | Nenhum P0/P1 aberto |
| I3 | coordenador | README, roteiro, relatório final | Critérios de conclusão atendidos |

## 4. Protocolo de integração
1. O agente commita em `crm/<agente>-…` com uma mensagem `[<tarefa>] …` e entrega `docs/reports/<agente>-<tarefa>.md`.
2. O coordenador confere o diff contra a lista de arquivos do agente (`git diff --name-only`), testa na worktree do agente e faz o merge local `--no-ff`. Em seguida roda typecheck, lint, build e `npm test` no slot 0.
3. Conflito ou mudança inesperada: o coordenador não faz o merge e devolve a tarefa ao agente.
4. Os agentes sincronizam a própria branch com a integração antes de cada onda.

## 5. Riscos
| Risco | Mitigação |
|---|---|
| Memória (8 GB) | No máximo 2 tarefas pesadas; pilhas Supabase só com db, auth, rest e kong, e só para agentes ativos; medição com `docker stats` e `vm_stat` antes de ampliar |
| Agente travado em pedido de permissão | O coordenador lê o terminal do agente (`orca terminal read`) e responde ou reinicia com escopo menor |
| Hipóteses H-E, H-A ou H-C mudarem | Tudo em migrações aditivas e enums ampliáveis, sem exclusão |
| Ordem das migrações | Só o agente A cria migrações |
