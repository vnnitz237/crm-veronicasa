# Relatório W3 — Agente A (defeito D2-04)

## Arquivos
- `supabase/migrations/20261113200000_revoga_execute_funcoes_gatilho.sql` (nova, aditiva)
- `tests/integracao/a-contrato.test.ts` (novo teste D2-04)
- `docs/reports/a-W3.md`
- `database.types.ts`: não regenerado (funções de gatilho não aparecem nos tipos; nada mudou).

## O que mudou
Bloco `do` que percorre todas as funções do schema `public` com `prorettype = trigger` e executa `revoke execute ... from public, anon`. Cobre as 11 funções atuais (`registrar_historico_acao`, `registrar_historico_negociacao`, `validar_vendedor_negociacao`, `validar_acao_venda`, `validar_conversa`, `garantir_telefone_canonico`, `coerencia_execucao_negociacao`, `limpar_execucao_na_recusa`, `proteger_campos_imutaveis`, `proteger_acao_imutavel`, `tocar_atualizado_em`). Funções e migrações antigas intactas. `authenticated` mantém o EXECUTE padrão (fora do escopo pedido; gatilhos não dependem dele).

## Testes
`npm run db:reset && npm run typecheck && npm run lint && npm run test:unit && npm run test:db`
- typecheck ok · lint ok · unit 38/38 · db 58/58 (inclui `qa-seguranca.test.ts` 15/15).
- Novo teste: nenhuma função de `public` que retorna trigger tem EXECUTE para `anon` (e há ≥ 11 delas).
- Gatilhos continuam disparando após o revoke: todos os testes de histórico, validação e imutabilidade (a-contrato, cenarios, regressao-revisao, qa-*) passam.
- Não há teste `test.fail` para o D2-04 em `qa-seguranca.test.ts`, portanto nenhum teste do QA passou a "expected to fail but passed" por esta correção.

## Riscos
- Funções de gatilho criadas no futuro voltam a receber EXECUTE padrão; o novo teste detecta isso.
