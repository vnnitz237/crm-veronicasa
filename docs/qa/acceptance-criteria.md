# Critérios de aceite — CRM Verônica Sá

Todos os critérios são verificáveis por teste automatizado no Supabase local, com dados fictícios. Datas no fuso de São Paulo.
Legenda: ✅ coberto e passando (13/11/2026) · 🆕 novo, a implementar · *provisório* = regra H-E/H-A/H-C aprovada provisoriamente.

## 1. Já implementado (regressão obrigatória em toda integração)

| ID | Critério | Teste |
|---|---|---|
| AC-01 ✅ | Sem login, qualquer página leva a `/login`; login inválido mostra erro | e2e `demonstracao.spec.ts` |
| AC-02 ✅ | Vendedora cadastra cliente, cria negociação (serviço + unidade) e fecha com data da venda | e2e e `cenarios.test.ts` |
| AC-03 ✅ | Um cliente com duas negociações de resultados diferentes conta 1 fechada + 1 não fechada | cenário 1 (banco) e e2e |
| AC-04 ✅ | Venda de 28/10 com execução prevista para 04/11 aparece em vendas de **outubro** e não de novembro | cenário 2 |
| AC-05 ✅ | O vendedor não lê, altera, cria nem exclui registros do outro, nem por URL direta (404 genérico) | cenário 3 e e2e |
| AC-06 ✅ | A gestora lê os dois vendedores e não edita nem cria | cenário 3 e e2e |
| AC-07 ✅ | "Fechou" sem data, "Não fechou" sem motivo e execução antes da venda são recusados pelo banco | `cenarios.test.ts` |
| AC-08 ✅ | O telefone com ou sem +55 tem a mesma chave; 8 e 9 dígitos são distintos; o DDD 55 é preservado | `regressao-revisao.test.ts`, unitários |
| AC-09 ✅ | Na reconciliação, duplicatas legadas são preservadas, marcadas e listadas | `regressao-revisao.test.ts` |
| AC-10 ✅ | Ao passar para "Não fechou", a execução prevista é limpa na mesma operação, com histórico | `regressao-revisao.test.ts` e e2e |
| AC-11 ✅ | Totais de outubro com os dados fictícios: 2 fechadas, R$ 2.000, 1 não fechada | cenário 2 |

## 2. M0 — Ambiente isolado (P0)

| ID | Critério |
|---|---|
| QA-M0-1 🆕 | `CRM_SLOT=1 npm run ambiente:isolado` sobe uma pilha em 546xx e gera o `.env.local` apontando para ela |
| QA-M0-2 🆕 | `npm test` no slot 1 e no slot 2 **ao mesmo tempo** terminam verdes, e o banco do slot 0 permanece intacto (contagem de clientes antes = depois) |
| QA-M0-3 🆕 | Sem `CRM_SLOT`, tudo funciona como hoje (slot 0, portas 545xx, e2e 3100) |

## 3. M5 — Edição de cliente (P1)

| ID | Critério |
|---|---|
| AC-M5-1 🆕 | Paula edita nome, e-mail e observações do Marcos; a ficha mostra os novos valores |
| AC-M5-2 🆕 | Paula troca o telefone para `+55 (11) 97777-0000`; o banco grava `11977770000` |
| AC-M5-3 🆕 | Paula troca para o telefone da Juliana (de outro vendedor, digitado com +55); aparece a mensagem genérica e nada muda |
| AC-M5-4 🆕 | Rafael abre `/clientes/<Marcos>/editar` e recebe 404; um POST forjado à ação não altera nada |
| AC-M5-5 🆕 | A gestora não vê o botão "Editar" e recebe 404 na rota |

`data-testid`: `editar-cliente`, `cliente-nome` (existente).

## 4. M4 — CSV do relatório de vendas (P1)

| ID | Critério |
|---|---|
| AC-M4-1 🆕 | Para a gestora, o CSV de outubro tem as mesmas linhas da tela (3 no seed) e a soma de valores das fechadas é 2000,00 |
| AC-M4-2 🆕 | O CSV de Rafael (outubro) tem só a venda dele |
| AC-M4-3 🆕 | O arquivo começa com BOM UTF-8, usa `;`, decimal com vírgula e datas `dd/mm/aaaa`; acentos legíveis |
| AC-M4-4 🆕 | Um cliente fictício chamado `=HYPERLINK("x")` sai como `'=HYPERLINK("x")` |
| AC-M4-5 🆕 | Sem sessão, a rota devolve 401 e não devolve dados |

`data-testid`: `exportar-csv`.

## 5. M1 — Execuções (P1, provisório H-E)

| ID | Critério |
|---|---|
| AC-M1-1 | Ao fechar uma venda, `status_execucao` vira `pendente` |
| AC-M1-2 | Paula marca como realizada em 04/11 a venda do Marcos (venda em 28/10). Ela aparece no relatório de **execução de novembro** e continua no de **vendas de outubro** |
| AC-M1-3 | Marcar como realizada sem data, ou com data anterior à venda, é recusado pelo banco |
| AC-M1-4 | Se a venda sair de "Fechou", os campos de execução são limpos e o histórico registra a mudança |
| AC-M1-5 | Uma venda pendente com execução prevista antes de hoje aparece como **atrasada** |
| AC-M1-6 | Rafael não registra execução de venda da Paula; a gestora lê e não edita |
| AC-M1-8 | Cancelar exige motivo; negociação não fechada não aceita `status_execucao`; o histórico registra cada mudança de execução com autor |
| AC-M1-7 | O CSV de execução tem as mesmas linhas da tela |

`data-testid`: `registrar-execucao`, `execucao-status`, `relatorio-execucao`, `ind-realizadas`, `ind-pendentes`, `ind-atrasadas`.

## 6. M2 — Ações comerciais (P1, provisório H-A)

| ID | Critério |
|---|---|
| AC-M2-1 | Paula registra uma ação realizada (ligação, 05/11) para o Marcos, ligada à negociação dele; ela aparece nas ações de **novembro** |
| AC-M2-2 | Paula agenda uma ação planejada para amanhã; ela aparece em "Próximas ações" na ficha e na lista do mês |
| AC-M2-3 | Ação realizada sem data, ou planejada sem data prevista, é recusada; ação ligada a negociação de **outro** cliente é recusada |
| AC-M2-4 | Cancelar uma ação muda a situação; nenhuma ação pode ser excluída |
| AC-M2-5 | Rafael não vê nem altera ações da Paula, nem por URL direta; a gestora vê as dos dois, com totais por vendedor e por tipo |
| AC-M2-6 | O relatório mensal de ações mostra **planejadas** e **realizadas** separadas (e canceladas à parte), com os mesmos números da lista |

`data-testid`: `acoes-mes`, `nova-acao`, `proximas-acoes`, `acao-situacao`.

## 7. M3 — Conversas (P1, provisório H-C)

| ID | Critério |
|---|---|
| AC-M3-1 | Paula registra uma conversa de WhatsApp com o Marcos (texto colado); ela aparece na ficha do cliente |
| AC-M3-2 | A conversa não pode ser editada nem excluída por ninguém pela aplicação; uma **correção** cria nova versão ligada à anterior, que continua legível no detalhe; uma versão só pode ser corrigida uma vez |
| AC-M3-3 | Rafael não lê a conversa (nem por URL direta) |
| AC-M3-4 | A gestora lista as conversas dos dois vendedores, filtra por vendedor, canal e período, abre a conversa e registra uma análise |
| AC-M3-5 | O vendedor não cria nem **vê** análises (nem pela API) |
| AC-M3-6 | Conteúdo acima de 20 mil caracteres é recusado |

`data-testid`: `conversas-cliente`, `nova-conversa`, `lista-conversas`, `conversa-conteudo`, `nova-analise`.

## 7b. M6 — Painel gerencial mínimo (P1)

| ID | Critério |
|---|---|
| AC-M6-1 🆕 | A gestora entra e cai em `/painel`; os cards do mês batem com o relatório de vendas, o de execução e o de ações do mesmo mês |
| AC-M6-2 🆕 | A tabela por vendedor mostra Paula e Rafael com vendas, valor, ações realizadas e execuções realizadas |
| AC-M6-3 🆕 | O vendedor recebe 404 em `/painel` |

`data-testid`: `painel`, `card-vendas`, `card-execucoes`, `card-acoes`, `card-conversas`, `painel-por-vendedor`.

## 8. QA transversal (W3)

| ID | Critério |
|---|---|
| QA-1 | Todas as tabelas novas têm RLS ativa, nenhuma política para `anon` e nenhuma política de DELETE (consulta a `pg_policies` e `pg_class.relrowsecurity`) |
| QA-2 | Toda função *security definer* nova tem `search_path` fixo e `execute` revogado de `anon` |
| QA-3 | Um perfil inativo não lê nada pela API (teste de banco) |
| QA-4 | Telas principais sem rolagem horizontal da página em 390 px (as tabelas rolam dentro do cartão) e em 1280 px — capturas anexadas |
| QA-5 | `npm run typecheck`, `lint`, `build` e `npm test` verdes na branch de integração |
| QA-6 | Nenhum segredo em `src/` ou no histórico do git; nenhuma chamada a serviço externo |

## 9. Critérios para a demonstração à cliente
1. `npm run db:reset` e o roteiro do README (atualizado com M1–M5) executam do começo ao fim sem erro, e há um e2e que segue o roteiro.
2. Todos os critérios ✅ e 🆕 aprovados passam.
3. O README lista claramente o que é **provisório** (hipóteses) e as decisões em aberto.
