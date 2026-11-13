# Relatório W3 — Agente C: correção D2-02 (rolagem horizontal em 390 px)

Base: integração `6bb992d`.

## Arquivos
- `src/app/(app)/relatorio/page.tsx`, `src/app/(app)/painel/page.tsx`, `src/app/(app)/relatorio/execucao/page.tsx`.

## O que mudou (só layout; lógica dos relatórios intocada)
- Barra de navegação do mês: `flex w-full flex-wrap … sm:ml-auto sm:w-auto` (quebra linha no celular; à direita a partir de `sm`).
- Formulário do mês com `min-w-0`; input de mês `w-40 min-w-0` (em vez de `w-full` herdado de `.campo`).
- `relatorio/page.tsx`: seções de tabela com `min-w-0` para a tabela rolar dentro do cartão sem alargar a grade.
- Detalhe e lista de negociações: já sem rolagem da página em 390 px (conferido pelo teste QA-4, que inclui `/negociacoes/[id]`); nada alterado.

## Testes
- `typecheck` ✅ · `lint` ✅ · `test:unit` ✅ 38/38 · `build` ✅.
- `npx playwright test responsividade m6-painel m1-execucao`: 14 passed (o QA-4 390 px continua "falha esperada").
- Verificação extra (cópia temporária do QA-4 sem `test.fail`, apagada em seguida): a **única** URL que ainda rola em 390 px é `/acoes?mes=2026-11` (scrollWidth 444). `/painel`, `/relatorio` e `/relatorio/execucao` não rolam mais.

## Riscos / pendências
- `/acoes` é do Agente B (`src/app/(app)/acoes/page.tsx`): aplicar a mesma correção (nav com `flex-wrap`, input de mês com largura limitada). Só depois disso o `test.fail` de D2-02 vai virar "expected to fail but passed" e poderá ser removido pelo Agente D.
