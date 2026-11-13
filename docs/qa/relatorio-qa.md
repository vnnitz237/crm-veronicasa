# Relatório de QA — M1–M6 (Agente D, tarefa D2)

Data: 13/11/2026 · branch `crm/d-qa` (sincronizada com a integração I2) · slot 4 · dados fictícios do seed.
Execução: `npm test` (db:reset + unit 38/38 + banco 57/57 + e2e 42/42, sendo 2 falhas **esperadas** marcadas com `test.fail` para defeitos conhecidos). Saída: EXIT 0.

Legenda: **PASSOU** · **FALHOU** · **BLOQUEADO** (não verificável nesta tarefa).

## 1. Regressão (AC-01 a AC-11)
| ID | Situação | Evidência |
|---|---|---|
| AC-01 – AC-11 | PASSOU | `demonstracao.spec.ts` (8/8), `cenarios.test.ts`, `regressao-revisao.test.ts`. A asserção da tela inicial da gestora já era `/painel` |

## 2. M0
| ID | Situação | Evidência |
|---|---|---|
| QA-M0-1/2/3 | BLOQUEADO | Fora do escopo do D2 (exige duas pilhas em paralelo; restrição de memória). A suíte inteira roda no slot 4 sem tocar no slot 0 |

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

Observação: o `data-testid="acao-situacao"` da especificação **não existe** (ver D2-03); os testes usam `acao-titulo`/`lista-acoes`.

## 7. M3 — Conversas
| ID | Situação | Evidência (`m3-conversas.spec.ts`) |
|---|---|---|
| AC-M3-1 | PASSOU | conversa colada aparece em `conversa-conteudo` e em `conversas-cliente` |
| AC-M3-2 | PASSOU | sem editar/excluir; correção cria v2; v1 legível com aviso; `/corrigir` da v1 → 404; 2ª correção pela API recusada; UPDATE/DELETE pela API não alteram |
| AC-M3-3 | PASSOU | Rafael 404 em detalhe, correção e nova conversa; lista sem dados da Paula |
| AC-M3-4 | PASSOU | filtros vendedor, canal, de/até; análise registrada; gestora não cria conversa (404) |
| AC-M3-5 | PASSOU | vendedor sem seção de análises; SELECT/INSERT/embed pela API vazios ou recusados |
| AC-M3-6 | PASSOU | 20 001 caracteres recusados na tela e pela API |

## 8. M6 — Painel
| ID | Situação | Evidência (`m6-painel.spec.ts`) |
|---|---|---|
| AC-M6-1 | PASSOU | login → `/painel`; cards = `ind-*` dos relatórios de vendas, execução e ações (out, nov, mês corrente); links levam ao detalhe do mesmo mês |
| AC-M6-2 | PASSOU | Paula e Rafael com as 4 colunas |
| AC-M6-3 | PASSOU | Paula e Rafael → 404 em `/painel`; tela inicial `/clientes` |

## 9. QA transversal
| ID | Situação | Evidência |
|---|---|---|
| QA-1 | PASSOU | `qa-seguranca.test.ts` › QA-1: todas as tabelas de `public` com RLS; nenhuma política para anon/public; nenhuma DELETE/ALL; anon não lê nenhuma tabela/visão |
| QA-2 | PASSOU com ressalva | `search_path` fixo em todas; `perfil_atual` e `reconciliar_telefones` sem execute para anon. **5 funções de gatilho** security definer mantêm execute para anon (ver D2-04) |
| QA-3 | PASSOU | Paula e Verônica inativas: leitura vazia em todas as tabelas, visões e RPCs; escrita recusada; perfil restaurado no `finally` |
| QA-4 | FALHOU (390 px) | `responsividade.spec.ts`: 1280 px ok; 390 px rola em `/painel`, `/relatorio`, `/acoes` (D2-02). Capturas em `test-results/qa4/` (não versionado) |
| QA-5 | PASSOU parcial | `npm test` verde; `tsc` e `eslint` sem erros em `tests/`. typecheck/lint/build da integração completa ficam com o coordenador |
| QA-6 | BLOQUEADO | Não auditado nesta tarefa (varredura de segredos no histórico) |

## 10. Defeitos
| ID | Sev. | Descrição | Reproduzir | Arquivo provável |
|---|---|---|---|---|
| D2-01 | P2 | O card "Conversas registradas" do painel leva a `/conversas?mes=AAAA-MM`, mas a lista ignora `mes` e mostra todas as conversas (o número do card não bate com a lista aberta) | Gestora → `/painel?mes=2026-10` → clicar no card de conversas: aparece a conversa da Juliana de 02/11 | `src/app/(app)/conversas/page.tsx` (aceitar `mes`) ou `src/app/(app)/painel/page.tsx` (usar `de`/`ate`). Teste `test.fail`: "DEFEITO D2-01" |
| D2-02 | P2 | Rolagem horizontal da página em 390 px: a barra de navegação do mês (← Anterior / mês / Ver / Próximo → / botões) não quebra linha; `scrollWidth` 444 (painel, ações) e 645 (relatório de vendas) | Viewport 390 px, gestora, abrir `/relatorio?mes=2026-10` | `nav` com `flex` sem `flex-wrap` em `src/app/(app)/relatorio/page.tsx`, `painel/page.tsx`, `acoes/page.tsx`. Teste `test.fail` em `responsividade.spec.ts` |
| D2-03 | P2 | `data-testid="acao-situacao"` exigido pela especificação não existe | `grep -r acao-situacao src` vazio | `src/components/acoes/SituacaoAcaoBadge.tsx` |
| D2-04 | P2 | Funções de gatilho security definer (`registrar_historico_acao`, `registrar_historico_negociacao`, `validar_vendedor_negociacao`, `validar_acao_venda`, `validar_conversa`, `garantir_telefone_canonico`) mantêm `EXECUTE` para `anon`. Não são chamáveis pela API (retornam `trigger`), portanto sem risco prático, mas descumprem a letra do QA-2 | `select has_function_privilege('anon', oid, 'execute')` em `pg_proc` | nova migração aditiva com `revoke execute … from public, anon` (Agente A) |
| D2-05 | P2 (obs.) | Conteúdo de conversa colado em `<textarea>` é gravado com quebras `\r\n` (normalização do navegador); a exibição é correta, mas a comparação textual com a fonte difere | Registrar conversa com várias linhas e ler `conversas.conteudo` | `src/app/(app)/conversas/actions.ts` (normalizar para `\n`, opcional) |

Nenhum defeito P0/P1 encontrado.

## 11. Reavaliação do D-01 (sessão de perfil inativo)
- O Auth **continua emitindo sessão** para um perfil com `ativo = false` (login com senha funciona).
- Com essa sessão, a RLS bloqueia tudo: `perfil_atual()` devolve nulo para inativos, e todas as políticas dependem dele. Testado: leitura vazia em `clientes`, `negociacoes`, `historico_*`, `acoes_venda`, `conversas`, `analises_conversa`, `conflitos_telefone`, nas três visões e nas três RPCs; UPDATE sem efeito; INSERT recusado em clientes, ações e conversas. Unidades e serviços também vêm vazios.
- Único dado visível: a **própria linha** em `perfis` (política `id = auth.uid()`), sem dados comerciais.
- **Conclusão:** não há risco de acesso a dados; o D-01 continua **P2** (experiência: o usuário inativo entra e vê telas vazias/erro em vez de uma mensagem clara). Recomenda-se, quando oportuno, bloquear na aplicação (`obterUsuarioAtual`) com mensagem de "acesso desativado".
