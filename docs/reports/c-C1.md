# Relatório C1 — M5 Edição de clientes + M4 CSV de vendas

## Arquivos
- `src/app/(app)/clientes/actions.ts` — `atualizarCliente`.
- `src/app/(app)/clientes/[id]/editar/page.tsx`, `form.tsx` — rota de edição (404 para gestora, outro vendedor, id inválido).
- `src/app/(app)/clientes/[id]/page.tsx` — link "Editar" (`editar-cliente`), só para o dono.
- `src/lib/csv.ts` — `gerarCsv` (pura).
- `src/app/(app)/relatorio/vendas.csv/route.ts` — `GET ?mes=AAAA-MM`.
- `src/app/(app)/relatorio/page.tsx` — botão "Exportar CSV" (`exportar-csv`) com o mês da tela.
- `src/proxy.ts` — `*.csv` sem sessão → 401.
- `tests/unit/c-csv.test.ts`.

## Funcionalidades
- **M5:** mesma validação do cadastro; `23505` → mensagem genérica de duplicado; `23514` → telefone inválido; 0 linhas → "Cliente não encontrado."; sucesso redireciona para `/clientes/{id}`. O UPDATE filtra por `id` e `vendedor_id` além da RLS.
- **M4:** usa `negociacoes_resultado_mes` com o cliente Supabase do usuário (mesma RLS e mesmo critério de mês da tela). Colunas da especificação; Resultado com `ROTULO_STATUS`; Data = venda ou recusa; Motivo = `motivo_perda`. Route handler também devolve 401 sem sessão/perfil ativo (defesa extra além do proxy). `relatorio.ts` não foi alterado.
- `gerarCsv`: BOM, `;`, CRLF, números com vírgula decimal, strings `AAAA-MM-DD` → `dd/mm/aaaa`, aspas/`;`/quebras escapadas, prefixo `'` em textos iniciados por `= + - @`, TAB ou CR (números não recebem prefixo).

## Testes
`npm run typecheck && npm run lint && npm run test:unit && npm run build` — todos verdes (unit: 3 arquivos, 20 testes). e2e não rodado (por instrução). Verificação manual no navegador não feita.

## Riscos / dúvidas
- Coluna **Valor** traz o valor da negociação em todas as linhas (como a tabela da tela), inclusive recusas. Se a regra for "só vendas fechadas", ajuste trivial — decisão comercial pendente.
- O select de **Origem** na edição tem opções fixas; um cliente com origem fora da lista apareceria como "—" e perderia o valor ao salvar (hoje o cadastro só gera valores da lista).
- Gestora no CSV recebe todas as linhas (RLS), coluna Vendedor(a) sempre presente.

## Commit
Ver `git log` — `[C1] Edição de clientes e CSV do relatório de vendas`.
