# Relatório D2 — QA independente de M1–M6 (Agente D)

## 1. Arquivos
- Novos: `tests/e2e/apoio.ts`, `m4-m5.spec.ts`, `m1-execucao.spec.ts`, `m2-acoes.spec.ts`, `m3-conversas.spec.ts`, `m6-painel.spec.ts`, `responsividade.spec.ts`; `tests/integracao/qa-seguranca.test.ts`; `docs/qa/relatorio-qa.md`.
- Nenhum arquivo da aplicação alterado. `demonstracao.spec.ts` não precisou de ajuste (já esperava `/painel`).

## 2. Funcionalidades
- e2e de aceite para todos os critérios AC-M1…AC-M6, com dados próprios criados e removidos pelo cliente admin (sem depender da ordem dos arquivos); critérios de "hoje" relativos à data atual em São Paulo.
- Banco: QA-1 (RLS, sem anon, sem DELETE, anon não lê nada), QA-2 (search_path, execute de anon), QA-3 (vendedora e gestora inativas, com restauração no `finally`) e lacunas de M1–M3 (históricos não forjáveis/legíveis por terceiros, execução alheia pela API, ação não excluível, `registrada_por` forjado, correção de conversa alheia, análise imutável, embed de análises).
- QA-4 em 390 e 1280 px, com capturas em `test-results/qa4/`.

## 3. Testes
`npm test` → EXIT 0: unit 38/38 · banco 57/57 (15 novos) · e2e 42/42 (34 novos; 2 marcados `test.fail` para os defeitos D2-01 e D2-02). `tsc --noEmit` e `eslint tests` sem erros.

## 4. Riscos e bloqueios
- Defeitos P2: D2-01 (link do card de conversas ignora o mês), D2-02 (rolagem horizontal em 390 px), D2-03 (`acao-situacao` ausente), D2-04 (execute de anon em funções de gatilho), D2-05 (CRLF no conteúdo). Nenhum P0/P1.
- D-01 reavaliado: sem risco de acesso; continua P2.
- QA-M0 e QA-6 não verificados nesta tarefa. `test-results/` não está no `.gitignore` (dono: coordenador); não foi versionado.
- Quando D2-01/D2-02 forem corrigidos, os testes `test.fail` passam a falhar por "passou inesperadamente": retirar o `test.fail`.

## 5. Commit
`[D2] e2e de aceite M1–M6, auditoria de segurança e relatório de QA` (hash no `git log`).
