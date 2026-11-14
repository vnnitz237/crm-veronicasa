# Relatório de QA — M1–M6 (Agente D, tarefas D2 e D3 — situação final)

Data: 13/11/2026 · branch `crm/d-qa` na integração `435e7bf` (correções W3) · slot 4 · dados fictícios do seed.
**Execução final (D3):** `npm test` (db:reset + unit 38/38 + banco 59/59 + e2e 42/42, **sem nenhum `test.fail`**). Saída: EXIT 0.

> **Pós-D3 (14/11/2026):** D-01 foi resolvido e integrado em `9440683`. A suíte completa na branch integrada terminou com typecheck, lint e build verdes; unit 38/38, banco 59/59 e e2e 46/46 (incluindo 4 novos testes de perfil inativo), EXIT 0.

Legenda: **PASSOU** · **FALHOU** · **BLOQUEADO** (não verificável nesta tarefa).

## 1. Regressão (AC-01 a AC-11)
| ID | Situação | Evidência |
|---|---|---|
| AC-01 – AC-11 | PASSOU | `demonstracao.spec.ts` (8/8), `cenarios.test.ts`, `regressao-revisao.test.ts`. A asserção da tela inicial da gestora já era `/painel` |

## 2. M0
| ID | Situação | Evidência |
|---|---|---|
| QA-M0-1 | PASSOU | Slot 4 em 549xx (`.env.local`: API 54921, banco 54922, e2e 3500), gerado pelo ambiente isolado |
| QA-M0-2 | PASSOU (isolamento) / BLOQUEADO (simultaneidade) | Contagem no slot 0 (`supabase_db_crm-veronica`, porta 54522), só SELECT via `docker exec … psql`, antes (18:05:18) e depois (18:06:30) do `npm test` completo no slot 4: clientes 4, negociacoes 6, acoes_venda 6, conversas 3, analises_conversa 1, historico_negociacoes 12 → **idênticas**. A execução simultânea de dois slots não foi refeita aqui (limite de memória) |
| QA-M0-3 | BLOQUEADO | Slot 0 é do coordenador; não executei nele para não escrever no seu banco |

## 3. M5 — Edição de cliente
| ID | Situação | Evidência (`tests/e2e/m4-m5.spec.ts`) |
|---|---|---|
| AC-M5-1 | PASSOU | "AC-M5-1/2: Paula edita nome, e-mail, observações e telefone" |
| AC-M5-2 | PASSOU | "AC-M5-2 (literal): +55 (11) 97777-0000 grava 11977770000" |
| AC-M5-3 | PASSOU | "AC-M5-3: telefone de cliente de outro vendedor → mensagem genérica e nada muda" |
| AC-M5-4 | PASSOU | "AC-M5-4: Rafael recebe 404…; POST forjado não altera" (id trocado no formulário → "Cliente não encontrado.") |
| AC-M5-5 | PASSOU | "AC-M5-5: gestora não vê Editar e recebe 404 na rota" |

## 4. M4 — CSV de vendas
| ID | Situação | Evidência (`m4-m5.spec.ts`) |
|---|---|---|
| AC-M4-1 | PASSOU | linhas do CSV = linhas da tela; soma das fechadas = `ind-valor` (seed: 3 linhas, 2000,00) |
| AC-M4-2 | PASSOU | "AC-M4-2: CSV do Rafael (outubro) só tem venda dele" |
| AC-M4-3 | PASSOU | BOM EF BB BF, `;`, CRLF, `1200,00`, `dd/mm/aaaa`, "Avaliação Completa" legível |
| AC-M4-4 | PASSOU | `'=HYPERLINK(""x"")` |
| AC-M4-5 | PASSOU | 401 sem dados em `vendas.csv` e `execucao.csv` |

## 5. M1 — Execuções
| ID | Situação | Evidência (`m1-execucao.spec.ts`; banco: `qa-seguranca.test.ts`) |
|---|---|---|
| AC-M1-1 | PASSOU | fechar pela tela → `execucao-status` "Pendente" e `pendente` no banco |
| AC-M1-2 | PASSOU | realizada 04/11 (venda 28/10): execução de nov ✔, não em out; vendas de out ✔, não em nov |
| AC-M1-3 | PASSOU | data anterior à venda e sem data (required removido) recusadas; banco inalterado |
| AC-M1-4 | PASSOU | "AC-M1-4/8": após "Não fechou" os 3 campos ficam nulos |
| AC-M1-5 | PASSOU | prevista = ontem (relativo a hoje, SP) → "Atrasada"; amanhã → "Pendente"; `ind-atrasadas` ≥ 1 |
| AC-M1-6 | PASSOU | Rafael: 404 na URL; formulário forjado → "Negociação não encontrada."; gestora sem formulário; banco: "M1: Rafael não registra execução da Paula pela API; gestora também não" |
| AC-M1-7 | PASSOU | CSV de execução = linhas da tela em out, nov e mês corrente |
| AC-M1-8 | PASSOU | cancelar sem motivo recusado; histórico com `alterado_por` = Paula |

## 6. M2 — Ações comerciais
| ID | Situação | Evidência (`m2-acoes.spec.ts`) |
|---|---|---|
| AC-M2-1 | PASSOU | ligação realizada 05/11 ligada à negociação, em nov e não em out |
| AC-M2-2 | PASSOU | planejada para amanhã (relativo) em `proximas-acoes` e na lista do mês |
| AC-M2-3 | PASSOU | sem data (realizada/planejada) e negociação de outro cliente (option forjada) recusadas; nada gravado |
| AC-M2-4 | PASSOU | cancelamento muda a situação; sem botão de excluir; DELETE pela API não remove |
| AC-M2-5 | PASSOU | Rafael 404 por URL e lista sem dados da Paula; gestora vê os dois, por responsável e por tipo |
| AC-M2-6 | PASSOU | indicadores = contagem da lista; somas por tipo e por responsável = indicadores (3 meses) |

Regressão D2-03: `acao-situacao` verificado no detalhe ("Cancelada", AC-M2-4) e na lista do mês ("Planejada", AC-M2-2).

## 7. M3 — Conversas
| ID | Situação | Evidência (`m3-conversas.spec.ts`) |
|---|---|---|
| AC-M3-1 | PASSOU | conversa colada aparece em `conversa-conteudo` e em `conversas-cliente` |
| AC-M3-2 | PASSOU | conteúdo gravado com `\n` e sem `\r` (regressão D2-05); sem editar/excluir; correção cria v2; v1 legível com aviso; `/corrigir` da v1 → 404; 2ª correção pela API recusada; UPDATE/DELETE pela API não alteram |
| AC-M3-3 | PASSOU | Rafael 404 em detalhe, correção e nova conversa; lista sem dados da Paula |
| AC-M3-4 | PASSOU | filtros vendedor, canal, de/até; análise registrada; gestora não cria conversa (404) |
| AC-M3-5 | PASSOU | vendedor sem seção de análises; SELECT/INSERT/embed pela API vazios ou recusados |
| AC-M3-6 | PASSOU | 20 001 caracteres recusados na tela e pela API |

## 8. M6 — Painel
| ID | Situação | Evidência (`m6-painel.spec.ts`) |
|---|---|---|
| AC-M6-1 | PASSOU | login → `/painel`; cards = `ind-*` dos relatórios de vendas, execução e ações (out, nov, mês corrente); links levam ao detalhe do mesmo mês; "regressão D2-01": `/conversas?mes=` filtra o mês (out só Marcos, nov só Juliana) |
| AC-M6-2 | PASSOU | Paula e Rafael com as 4 colunas |
| AC-M6-3 | PASSOU | Paula e Rafael → 404 em `/painel`; tela inicial `/clientes` |

## 9. QA transversal
| ID | Situação | Evidência |
|---|---|---|
| QA-1 | PASSOU | `qa-seguranca.test.ts` › QA-1: todas as tabelas de `public` com RLS; nenhuma política para anon/public; nenhuma DELETE/ALL; anon não lê nenhuma tabela/visão |
| QA-2 | PASSOU | `search_path` fixo em todas as security definer; **nenhuma** security definer executável por anon (gatilhos incluídos, migração `20261113200000`). A única função de `public` executável por anon é `normalizar_telefone` — security invoker, `immutable`, sem acesso a tabelas (só formata texto); risco nulo, mantida por ser o grant padrão. Teste fixa essa lista exata |
| QA-3 | PASSOU | Paula e Verônica inativas: leitura vazia em todas as tabelas, visões e RPCs; escrita recusada; perfil restaurado no `finally` |
| QA-4 | PASSOU | `responsividade.spec.ts`: 13 telas sem rolagem horizontal em 390 e 1280 px (sem `test.fail`). Capturas em `test-results/qa4/` (não versionado) |
| QA-5 | PASSOU | `npm test` verde (inclui `next build` do e2e); `tsc --noEmit` sem erros. Lint completo da integração: coordenador |
| QA-6 | PASSOU | `git log -p --all`: nenhuma ocorrência de `sb_secret_`, JWT (`eyJhbGci`), chave privada ou senha além da de demonstração; nenhum `.env*` versionado (`.gitignore` tem `.env*`). `src/`: sem `SERVICE_ROLE`, sem URL `http(s)://` e sem `fetch`/`axios`/WebSocket — só o cliente Supabase pela URL do `.env.local` (local) |

## 10. Defeitos (situação final)
| ID | Sev. | Descrição | Situação final | Evidência |
|---|---|---|---|---|
| D2-01 | P2 | Card de conversas do painel → `/conversas?mes=` ignorava o mês | **CORRIGIDO** (W3-B) | `m6-painel.spec.ts` "regressão D2-01" |
| D2-02 | P2 | Rolagem horizontal em 390 px em painel, relatórios e ações | **CORRIGIDO** (W3-B/C) | `responsividade.spec.ts` 390 px |
| D2-03 | P2 | `data-testid="acao-situacao"` ausente | **CORRIGIDO** (W3-B) | `m2-acoes.spec.ts` AC-M2-2 e AC-M2-4 |
| D2-04 | P2 | Funções de gatilho security definer executáveis por anon | **CORRIGIDO** (W3-A, migração `20261113200000`) | `qa-seguranca.test.ts` QA-2 |
| D2-05 | P2 | Conteúdo de conversa gravado com `\r\n` | **CORRIGIDO** (W3-B) | `m3-conversas.spec.ts` AC-M3-1/2 |

Nenhum defeito novo encontrado no D3. Observação sem defeito: `normalizar_telefone` executável por anon (ver QA-2).

## 11. D-01 — sessão de perfil inativo
- **Resolvido em `9440683`:** a Server Action de login valida o perfil ativo e encerra sessões rejeitadas; o proxy revoga imediatamente uma sessão existente quando o perfil é desativado.
- O usuário termina em `/login` com a mensagem "Acesso desativado. Fale com a gestão.", sem loop de redirecionamento.
- Downloads CSV continuam respondendo 401 sem sessão. Usuários ativos continuam entrando normalmente.
- A RLS permanece como segunda camada e continua bloqueando todos os dados para perfis inativos.
- Evidência: `tests/e2e/perfil-inativo.spec.ts`, 4/4; suíte integrada 38 unitários + 59 de banco + 46 e2e.

## 12. Critérios para a demonstração
| # | Critério | Situação |
|---|---|---|
| 1 | `db:reset` e roteiro de ponta a ponta | PASSOU — `npm test` faz o reset e `demonstracao.spec.ts` percorre o roteiro (8/8). A conferência textual do README atualizado é do coordenador |
| 2 | Todos os critérios ✅ e 🆕 aprovados passam | PASSOU — AC-01..11, AC-M1..M6, QA-1..6 e QA-M0-1 passam; QA-M0-2 (simultaneidade) e QA-M0-3 não reexecutados por mim |
| 3 | README lista o provisório e as decisões abertas | Não avaliado pelo QA (documento do coordenador) |

**Veredito:** **APTO para a demonstração**, do ponto de vista de QA. Não há defeito aberto de P0 a P2; o D-01 foi resolvido após o D3 e validado novamente na suíte integrada.
