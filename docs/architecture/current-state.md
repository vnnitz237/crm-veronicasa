# Estado atual — CRM Verônica Sá

> **Atualização de 14/11/2026 — versão de demonstração certificada** na branch `vnnitz237/crm-veronica-planejamento` (`9440683` e seguintes), com M0–M6 e a rejeição de perfis inativos integrados. Gates: typecheck, lint e build ok; unit 38/38; banco 59/59; e2e 46/46. As seções abaixo registram a **auditoria inicial** (antes da conclusão) e ficam como histórico.

Auditoria de 13/11/2026 sobre o commit `a262681` ("Consolida MVP do CRM Verônica Sá (Etapa 1)"), branch `vnnitz237/crm-veronica-planejamento`. Todos os dados são fictícios, e o Supabase é apenas local.

## 1. Repositório e ambiente

| Item | Situação verificada |
|---|---|
| Branch de trabalho | `vnnitz237/crm-veronica-planejamento` em `a262681`, árvore limpa |
| `main` | Ainda no `Initial commit` (`ce89cf6`). O MVP **não** foi integrado à `main` |
| Worktrees (Orca) | `main` em `/Users/vinicius/orca/projects/crm-veronica-planejamento` e a worktree desta branch |
| Stack | Next.js 16.4.6 (App Router, Server Actions, `proxy.ts`), React 19.3, Tailwind 4, Supabase CLI 2.122 (npm), Postgres 17 |
| Supabase local | Projeto `crm-veronica`, portas 54520–54529. Ativos: db, auth, rest e kong; o restante desligado |
| Spec Kit | Não instalado (`specify` e `uv` ausentes). Documentação em Markdown equivalente |
| Orca | CLI 1.4.256 responde. Existem `worktree create --agent/--prompt/--base-branch/--branch`, `agent launch`, `orchestration send/check/worker-start`. **Verificados só pela ajuda e por `worktree list`; nenhum agente foi iniciado ainda** |
| Agentes instalados | `claude` 2.1.321 e `codex` 0.155.1 |
| Máquina | 8 GB de RAM, 3,8 GB para o Docker. Uma pilha Supabase do projeto usa cerca de 330 MB |

## 2. Verificações executadas (13/11/2026)

| Verificação | Resultado |
|---|---|
| `npm run typecheck` | ✅ |
| `npm run lint` | ✅ |
| `npm run build` | ✅ 10 rotas (9 dinâmicas) e o proxy |
| `npm run test:unit` | ✅ 15/15 |
| `npm run test:db` (RLS e regras, com usuários reais) | ✅ 25/25 |
| `npm run test:e2e` (Playwright, build de produção) | ✅ 8/8 |
| `npm audit` | 7 vulnerabilidades moderadas, todas transitivas na cadeia do ESLint (só desenvolvimento). Nenhuma alta ou crítica |
| Segredos | Nenhum uso de chave secreta em `src/`. `.env.local` está no `.gitignore` e nunca foi commitado |

## 3. Arquitetura

```
Navegador ──► Next.js (proxy.ts: renova a sessão e manda quem não está logado para /login)
                │  Server Components (leitura) + Server Actions (escrita)
                │  cliente Supabase com chave PÚBLICA + cookie do usuário
                ▼
            Supabase Auth ─► PostgREST ─► Postgres (RLS + gatilhos + restrições)
```

- **Toda autorização está no banco.** A aplicação nunca usa a chave secreta (`src/lib/supabase/server.ts`), e as telas só escondem botões.
- **Perfis:** `perfis.perfil` vale `vendedor` ou `gestor`. `perfil_atual()` retorna nulo para perfil inativo, e então nenhuma política libera acesso (`fundacao.sql:104`).
- **Relatório:** `negociacoes_resultado_mes(ano, mes)` é *security invoker*, então cada perfil só recebe o que a RLS permite (`fundacao.sql:260`). A consolidação é feita em `src/lib/relatorio.ts`.

### Modelo de dados

| Tabela / objeto | Papel | Origem |
|---|---|---|
| `perfis` | Usuário com perfil e indicador de ativo | `fundacao.sql:19` |
| `unidades`, `servicos` | Cadastros básicos | `fundacao.sql:28,34` |
| `clientes` | Telefone canônico único e `telefone_em_revisao` | `fundacao.sql:40`, `telefone_canonico…sql` |
| `negociacoes` | A venda: 1 serviço + 1 unidade, status, datas | `fundacao.sql:55` |
| `historico_negociacoes` | Auditoria (gatilho) | `fundacao.sql:88` |
| `conflitos_telefone` | Conflitos legados em revisão (só a gestora lê) | `telefone_canonico…sql:30` |
| `vw_negociacoes` | Visão de leitura (*security_invoker*) | `fundacao.sql:230` |

### Gatilhos e regras no banco

| Gatilho / restrição | Regra |
|---|---|
| `negociacoes_fechou_exige_data_venda` | "Fechou" exige a data da venda |
| `negociacoes_perda_exige_data_e_motivo` | "Não fechou" exige data e motivo |
| `negociacoes_execucao_apos_venda` | A execução prevista não pode ser anterior à venda |
| `negociacoes_recusa_sem_execucao` (gatilho e restrição) | "Não fechou" não tem execução prevista |
| `clientes_telefone_canonico` (gatilho) e índice único parcial | Telefone canônico, único em toda a base, à prova de concorrência |
| `*_campos_imutaveis` | Não troca dono do cliente nem cliente/vendedor da negociação |
| `negociacoes_vendedor_do_cliente` | A negociação pertence ao dono do cliente |
| `negociacoes_historico` | Registra criação e mudanças com autor |
| Sem política de DELETE | Ninguém exclui pela aplicação |

## 4. Inventário de funcionalidades (com evidência)

| Funcionalidade | Estado | Evidência |
|---|---|---|
| Login e logout, sessão e redirecionamento | ✅ Concluída | `src/proxy.ts`, `src/app/login/*`; e2e "sem login…" |
| Cadastro de clientes | ✅ | `src/app/(app)/clientes/actions.ts:11`; e2e |
| Lista e busca de clientes (nome ou telefone, inclusive com +55) | ✅ | `clientes/page.tsx` |
| Ficha do cliente com negociações | ✅ | `clientes/[id]/page.tsx` |
| **Edição de dados do cliente** | ❌ Ausente na tela (o banco e a RLS já permitem) | não há rota nem ação |
| Telefone canônico e único, reconciliação de legado | ✅ | `telefone_canonico…sql`; `regressao-revisao.test.ts` |
| Resolução de telefones em revisão | ❌ Sem tela (depende da decisão 3) | — |
| Negociação: criar, registrar resultado, histórico | ✅ | `negociacoes/actions.ts:17,52`; testes |
| Edição de valor, serviço ou unidade de uma negociação | ❌ Sem tela (o histórico já cobre esses campos) | — |
| Relatório mensal de vendas (vendedor e gestora; por vendedor, serviço e unidade) | ✅ | `relatorio/page.tsx`; cenário 2 |
| Filtros por vendedor, serviço e unidade no relatório | ⚠️ Parcial: agrupamentos sim, filtros não | `relatorio/page.tsx` |
| Isolamento entre vendedores; gestora só lê | ✅ | cenário 3 (banco e e2e) |
| **Ações de venda do mês** | ❌ Ausente (Etapa 2; decisão 11) | nenhuma tabela |
| **Execução realizada e relatório de execução** | ❌ Ausente (Etapa 3; decisão 12). Só existe a execução *prevista* | coluna `data_execucao_prevista` |
| **Conversas e análise pela gestora** | ❌ Ausente (Etapa 4; decisão 13) | nenhuma tabela |
| **Exportação CSV** | ❌ Ausente | — |
| **Painel (dashboard) da gestora** | ❌ Ausente. A tela inicial da gestora é o relatório | `(app)/page.tsx` |
| Configurações (serviços, unidades, usuários) | ❌ Sem tela. RLS para serviços e unidades pronta; usuários só por SQL | `fundacao.sql:302-316` |
| Responsividade | ⚠️ Parcial: telas usáveis em 390 px, tabelas com rolagem horizontal | capturas da rodada anterior |

## 5. Defeitos e riscos encontrados

| ID | Severidade | Descrição | Evidência |
|---|---|---|---|
| R-01 | **P0 para o paralelismo** | Um único Supabase local, com portas fixas, e `npm test` executa `db reset`. Agentes em paralelo destruiriam o banco uns dos outros. A porta do e2e (3100) também é fixa | `supabase/config.toml`, `playwright.config.ts:6`, `package.json` (`test`) |
| R-02 | **P0 para o escopo** | As etapas 2, 3 e 4 dependem das decisões 11, 12 e 13, ainda sem confirmação da cliente | README, "Decisões pendentes" |
| R-03 | P1 para a integração | `main` não contém o MVP. A integração precisa acontecer na branch de trabalho até haver aprovação | `git worktree list` |
| D-01 | **Resolvido em `9440683`** | O login rejeita o perfil inativo, encerra a sessão e mostra mensagem clara; o proxy também revoga sessões existentes sem alterar o 401 dos CSVs | `tests/e2e/perfil-inativo.spec.ts` (4/4) |
| D-02 | P2 | 7 vulnerabilidades moderadas em dependências de desenvolvimento (ESLint/minimatch) | `npm audit` |
| D-03 | P2 | Listas sem paginação (clientes e negociações) | `clientes/page.tsx`, `negociacoes/page.tsx` |
| R-04 | Risco | 8 GB de RAM limitam o paralelismo real: cada agente com servidor Next, Playwright e Supabase consome cerca de 1 a 1,5 GB | `sysctl`, `docker stats` |

## 6. Decisões já implementadas (preservar)

1. A venda é a negociação: 1 serviço e 1 unidade, com resultado próprio.
2. Mês da venda = data da venda. Mês da recusa = data da recusa. A execução não muda o mês. Conversão = fechadas ÷ (fechadas + não fechadas).
3. "Não fechou" exige data e motivo e não tem execução prevista.
4. O telefone é canônico (sem o 55) e único na base toda (provisório). 8 e 9 dígitos são números distintos. Conflitos legados são preservados e marcados.
5. RLS: o vendedor vê e edita só o que é dele, a gestora lê tudo e não edita, ninguém exclui, e o cadastro público está desligado.
6. O histórico registra autor e horário.
7. Apenas o Supabase local e dados fictícios; nenhuma integração externa.

As decisões comerciais em aberto (1 a 14) estão no README e em `docs/specs/crm-completion.md`.
