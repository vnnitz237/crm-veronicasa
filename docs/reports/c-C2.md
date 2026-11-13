# Relatório C2 — M1 Execuções + CSV de execução + M6 Painel (Agente C)

Branch `crm/c-fluxos`, slot 3. Commit de código: `05f08c4` (este relatório vem no commit seguinte).

## Arquivos
- `src/app/(app)/negociacoes/actions.ts`: nova ação `registrarExecucao`.
- `src/app/(app)/negociacoes/[id]/execucao-form.tsx` (novo) e `[id]/page.tsx`: seção Execução e rótulos novos no histórico.
- `src/lib/relatorio-execucao.ts` (novo, puro).
- `src/app/(app)/relatorio/execucao/page.tsx` e `relatorio/execucao.csv/route.ts` (novos).
- `src/app/(app)/relatorio/page.tsx`: link "Relatório de execução" (`link-relatorio-execucao`).
- `src/lib/painel.ts` (novo, puro) e `src/app/(app)/painel/page.tsx` (novo).
- `src/lib/csv.ts`: números com 2 casas (`1200` → `1200,00`).
- Testes: `tests/unit/c-csv.test.ts` (atualizado), `c-relatorio-execucao.test.ts`, `c-painel.test.ts` (novos).

## Funcionalidades
- **`registrarExecucao`** (campos `id`, `status_execucao`, `data_execucao_realizada`, `data_execucao_prevista`, `motivo_cancelamento_execucao`): só perfil vendedor, só o dono (conferido e repetido no `update` com `eq vendedor_id`), só `status = fechou`. Valida datas, realizada ≥ data da venda, prevista ≥ data da venda (mesma regra de `registrarResultado`), motivo obrigatório em cancelada. Limpa os campos que não valem para o status escolhido. Erros das restrições do banco traduzidos pelo nome da restrição.
- **Detalhe da negociação**: seção `execucao` (só se fechou) com `execucao-status` (Pendente/Atrasada/Realizada/Cancelada; atributo `data-status`), `execucao-prevista`, `execucao-realizada`, motivo; formulário `registrar-execucao` só para o dono. Histórico: rótulos para `status_execucao`, `data_execucao_realizada`, `motivo_cancelamento_execucao`.
- **`/relatorio/execucao?mes=AAAA-MM`** (`relatorio-execucao`): indicadores `ind-realizadas` (+ `ind-valor-executado`), `ind-pendentes`, `ind-atrasadas`, `ind-canceladas`; navegação de mês; coluna vendedor só para a gestora; tabela `relatorio-execucao-detalhe`; botão `exportar-csv-execucao`.
- **`/relatorio/execucao.csv?mes=`**: mesmas linhas e ordem da tela; 401 sem sessão (proxy + rota), como o de vendas.
- **`/painel?mes=AAAA-MM`** (`painel`): vendedor → 404. Cards `card-vendas` (fechadas, valor, conversão), `card-execucoes` (realizadas, pendentes, atrasadas), `card-acoes` (realizadas, planejadas), `card-conversas` (contagem de `vw_conversas` com `versao_atual` e `ocorrida_em` no mês, fuso São Paulo). Tabela `painel-por-vendedor`: vendas, valor, ações realizadas, execuções realizadas.

## Testes
- `npm run typecheck` ✅ · `npm run lint` ✅ · `npm run test:unit` ✅ 26/26 (5 arquivos) · `npm run test:db` ✅ 42/42 · `npm run build` ✅.
- e2e não rodado (restrição de memória do brief).

## Riscos / pontos em aberto
- **Atrasadas**: contadas entre as linhas do mês (pendentes com prevista no mês e < hoje). Uma pendente prevista para um mês anterior continua atrasada, mas só aparece no relatório do mês da previsão. Se a cliente quiser "todas as atrasadas até hoje" no mês corrente, é preciso decidir a regra (não inventei).
- **Pendentes sem data prevista** não entram em `negociacoes_execucao_mes`; a tela avisa.
- "Pendentes" inclui as atrasadas (atrasadas é subconjunto).
- Card de conversas usa UTC−3 fixo (Brasil sem horário de verão desde 2019).
- Links `/acoes?mes=` e `/conversas?mes=` dependem das telas do Agente B.
- O CSV de vendas agora mostra valores com 2 casas (ajuste M4): e2e que comparem o texto exato do CSV de vendas podem precisar de atualização.

## Para o coordenador (menu / tela inicial)
- Gestora: `/painel` (tela inicial), `/relatorio`, `/relatorio/execucao`.
- Vendedor: `/relatorio/execucao` (mostra só as próprias).
