# Agentes, worktrees e propriedade de arquivos

Situação: **aprovado (13/11/2026)**. Especificação: `docs/specs/crm-completion.md`.

## 1. Agentes e ambientes

| Agente | Papel | Worktree / branch | Slot (pilha Supabase · porta e2e) |
|---|---|---|---|
| Coordenador | Documentos, M0, revisão, merges locais, pontos de integração, README, relatório final | atual / `vnnitz237/crm-veronica-planejamento` (integração) | 0 · 545xx · 3100 |
| **A** Backend, banco e segurança | Migrações, RLS, gatilhos, funções SQL, seed, tipos | `crm-a-backend` / `crm/a-backend` | 1 · 546xx · 3200 |
| **B** Frontend e UX (módulos de tela) | Ondas 2–3: M2 Ações e M3 Conversas | `crm-b-frontend` / `crm/b-frontend` | 2 · 547xx · 3300 |
| **C** Fluxos e API (módulos de fluxo) | Onda 1: M5 e M4. Onda 2: M1 Execução e M6 Painel | `crm-c-fluxos` / `crm/c-fluxos` | 3 · 548xx · 3400 |
| **D** QA independente | Testes de aceite, e2e, regressão, auditoria de RLS e relatório de QA | `crm-d-qa` / `crm/d-qa` | 4 · 549xx · 3500 |

Agente: Claude Code (`claude`). **No máximo 2 agentes em tarefa pesada** (build, e2e, suíte completa) ao mesmo tempo. O coordenador só amplia depois de medir memória e estabilidade.

## 2. Propriedade exclusiva de arquivos, por onda

Um arquivo tem **um** dono por vez. Para alterar um arquivo alheio, o agente pede ao coordenador.

### Sempre
| Caminho | Dono |
|---|---|
| `supabase/migrations/**` (só arquivos **novos**, a partir de `20261113100000`), `supabase/seed.sql`, `supabase/config.toml`, `src/lib/supabase/database.types.ts`, `tests/integracao/a-*.test.ts` | **A** |
| `tests/e2e/**`, `tests/integracao/qa-*.test.ts`, `tests/integracao/cenarios.test.ts`, `tests/integracao/regressao-revisao.test.ts`, `tests/unit/relatorio.test.ts`, `tests/unit/validacao.test.ts`, `tests/fixtures.ts`, `tests/supabase.ts`, `tests/setup-env.ts`, `playwright.config.ts`, `vitest.config.mts`, `docs/qa/**` | **D** |
| `package.json`, `package-lock.json`, `.gitignore`, `scripts/**`, `README.md`, `AGENTS.md`, `docs/architecture/**`, `docs/specs/**`, `docs/plans/**`, `src/app/(app)/layout.tsx`, `src/app/(app)/page.tsx` | **Coordenador** |
| `docs/reports/<agente>-*.md` | o próprio agente |

### Onda 1
| Caminho | Dono |
|---|---|
| `src/app/(app)/clientes/actions.ts`, `src/app/(app)/clientes/[id]/editar/**`, `src/app/(app)/clientes/[id]/page.tsx` (só o link "Editar"), `src/app/(app)/relatorio/page.tsx` (só o botão CSV), `src/app/(app)/relatorio/vendas.csv/**`, `src/lib/csv.ts`, `src/proxy.ts`, `tests/unit/c-*.test.ts` | **C** |

### Ondas 2 e 3 (módulos verticais)
| Caminho | Dono |
|---|---|
| `src/app/(app)/acoes/**`, `src/app/(app)/clientes/[id]/acoes/**`, `src/components/acoes/**`, `src/lib/acoes.ts`, `src/app/(app)/conversas/**`, `src/app/(app)/clientes/[id]/conversas/**`, `src/components/conversas/**`, `src/lib/conversas.ts`, `tests/unit/b-*.test.ts` | **B** |
| `src/app/(app)/negociacoes/**`, `src/app/(app)/relatorio/**` (inclusive `execucao/` e `execucao.csv/`), `src/app/(app)/painel/**`, `src/lib/relatorio-execucao.ts`, `src/lib/painel.ts`, `src/lib/csv.ts`, `src/proxy.ts`, `tests/unit/c-*.test.ts` | **C** |
| `src/app/(app)/clientes/[id]/page.tsx`, `src/app/(app)/clientes/actions.ts` | **Coordenador** (monta `ProximasAcoes` e `ConversasCliente` na integração) |
| Arquivos existentes não listados (`src/lib/auth.ts`, `formato.ts`, `validacao.ts`, `relatorio.ts`, `supabase/server.ts`, `components/status.tsx`, `components/telefone.tsx`, `globals.css`, login) | **Congelados.** Mudança só via pedido ao coordenador |

## 3. Tarefas

| Onda | A | B | C | D |
|---|---|---|---|---|
| 1 | **A1** contrato de dados M1+M2+M3 | — | **C1** M5 edição + M4 CSV de vendas | **D1** (se houver memória) testes de aceite de banco para M1–M3, escritos pela especificação |
| 2 | **A2** correções e índices sob demanda | **B2** M2 Ações + M3 Conversas | **C2** M1 Execução + CSV de execução + M6 Painel | **D2** e2e de M1–M6 e regressão |
| 3 | suporte | ajustes do QA | ajustes do QA | **D3** QA independente e `docs/qa/relatorio-qa.md` |

## 4. Entrega obrigatória de cada tarefa
`docs/reports/<agente>-<tarefa>.md` contendo:
1. arquivos modificados;
2. funcionalidades concluídas;
3. comandos de teste e resultados;
4. riscos e bloqueios;
5. hash do commit `[<tarefa>] …`.

Também é preciso atualizar o comentário da worktree no Orca a cada marco.

**Regras invioláveis:**
- sem push, sem merge, sem tocar na `main`;
- sem serviços externos e sem dados reais;
- sem migração destrutiva e sem excluir dados;
- não editar arquivos de outro dono;
- não rodar `supabase` direto, só pelos scripts npm (o *wrapper* garante o banco do próprio slot).

## 5. Lançamento (Orca)

As worktrees partem da branch de integração. O coordenador faz o preparo (`npm ci`, `.crm-slot`, `npm run ambiente:isolado`) e só então inicia cada agente com `orca agent launch --worktree <id> --agent claude --prompt "<brief>"`. Os *briefs* ficam em `docs/plans/briefs/<tarefa>.md`. Os comandos e recibos reais de cada lançamento ficam registrados em `docs/plans/orchestration-log.md`.
