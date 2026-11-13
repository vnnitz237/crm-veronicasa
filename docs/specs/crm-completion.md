# Especificação de conclusão do MVP — CRM Verônica Sá

Situação: **APROVADA com condições em 13/11/2026.** Base: `docs/architecture/current-state.md`.

Regras gerais mantidas:
- Supabase local e dados fictícios; nenhuma integração externa.
- Toda autorização na RLS; ninguém exclui pela aplicação; a gestora não edita registros dos vendedores.
- **Nenhuma migração destrutiva:** só migrações novas e aditivas, sem `DROP` de colunas ou tabelas com dados e sem `TRUNCATE`/`DELETE` de dados comerciais.
- Migrações já aplicadas não são editadas.

> **REGRAS PROVISÓRIAS (H-E, H-A, H-C).** As regras de Execução, Ações e Conversas abaixo foram aprovadas **provisoriamente** para o MVP; dependem das decisões 11 a 13 da cliente. Devem ser implementadas de forma que uma mudança futura seja feita **sem perda de dados**: enums e colunas ampliáveis, nada de exclusão, histórico preservado. O README deve marcá-las como provisórias.

## 1. Escopo e prioridade

| Módulo | Prioridade |
|---|---|
| M0 Isolamento de bancos, portas e ambientes de teste | **P0** |
| M5 Edição de clientes | P1 |
| M4 Exportação CSV (vendas; execução depois do M1) | P1 |
| M1 Execuções e relatório de execução — *provisório H-E* | P1 |
| M2 Ações comerciais e relatório mensal de ações — *provisório H-A* | P1 |
| M3 Conversas e análise da gestora — *provisório H-C* | P1 |
| M6 Painel gerencial mínimo | P1 |
| Integração, testes e roteiro de demonstração | P1 |
| M7 Configurações (serviços e unidades), paginação, filtros adicionais, melhorias visuais, M8 telefones em revisão (decisão 3) | P2 |
| D-01 Sessão de perfil inativo | P2 (reavaliar se o QA encontrar risco de acesso) |

## 2. Contratos

### M0 — Ambiente isolado por worktree (P0)
- O arquivo `.crm-slot` na raiz da worktree (ignorado pelo git) ou a variável `CRM_SLOT` define o slot `n` (0 a 4). Sem slot, vale o 0 — comportamento atual.
- `scripts/supabase.mjs` é o *wrapper* do Supabase CLI. Para n > 0, ele:
  - sincroniza `supabase/` em `.local/supabase-slot<n>/supabase/`;
  - troca o `project_id` para `crm-veronica-s<n>` e as portas 545xx por 54(5+n)xx;
  - roda `supabase … --workdir .local/supabase-slot<n>`.
- `npm run ambiente:isolado` grava o slot, sobe a pilha e gera o `.env.local`, incluindo `E2E_PORT = 3100 + 100·n`.
- Todos os scripts `db:*`, `env:local` e `test` passam pelo *wrapper*. O Playwright usa `E2E_PORT`.

### M5 — Edição de clientes (P1)
- Ação `atualizarCliente(prev: EstadoCliente, fd: FormData): Promise<EstadoCliente>` em `src/app/(app)/clientes/actions.ts`.
  - Campos: `id`, `nome`, `telefone`, `email`, `origem`, `observacoes`.
  - Validação igual à do cadastro. `23505` gera a mensagem genérica de duplicado; `23514`, telefone inválido.
  - Sucesso redireciona para `/clientes/{id}`. Zero linhas afetadas gera "Cliente não encontrado."
- Rota `/clientes/[id]/editar`, só para o vendedor dono; para os demais, `notFound()`.
- Link "Editar" (`data-testid="editar-cliente"`) na ficha, visível só para o dono.
- Nenhuma migração.

### M4 — CSV (P1)
- `GET /relatorio/vendas.csv?mes=AAAA-MM` (*route handler*), com o cliente Supabase do usuário (a mesma RLS).
  - Sem sessão: **401** sem dados. O proxy não redireciona caminhos `*.csv`; ele responde 401.
- Formato para Excel em português: BOM UTF-8, `;`, CRLF, decimal com vírgula, datas `dd/mm/aaaa`.
- Colunas: Cliente; Serviço; Unidade; Vendedor(a); Resultado; Data da venda/recusa; Motivo; Execução prevista; Valor.
- Proteção contra injeção de fórmula: células que começam com `= + - @`, tabulação ou CR recebem o prefixo `'`.
- `src/lib/csv.ts` exporta `gerarCsv(colunas: string[], linhas: (string|number|null)[][]): string`, uma função pura.
- Botão "Exportar CSV" (`data-testid="exportar-csv"`) no relatório.
- Depois do M1: `GET /relatorio/execucao.csv?mes=` com as linhas do relatório de execução.

### M1 — Execuções (P1) — **PROVISÓRIO H-E**
Modelo: colunas novas em `negociacoes`. Se no futuro houver várias execuções por venda, os dados migram para uma tabela própria sem perda.
- Enum `public.status_execucao`: `pendente | realizada | cancelada`.
- Colunas novas em `negociacoes`:
  - `status_execucao public.status_execucao` (nulo se o status não for `fechou`);
  - `data_execucao_realizada date`;
  - `motivo_cancelamento_execucao text`.
- Regras no banco (restrições e gatilho):
  - **Só negociações fechadas têm execução:** `(status = 'fechou') = (status_execucao is not null)`.
  - Ao virar `fechou`, `status_execucao` vira `pendente` automaticamente, se estiver nulo.
  - Ao sair de `fechou`, os três campos de execução são limpos (como já ocorre com a execução prevista em "Não fechou").
  - `realizada` ⇔ `data_execucao_realizada` não nula. A data realizada deve ser maior ou igual a `data_venda`.
  - `cancelada` exige `motivo_cancelamento_execucao`; nos outros status, o motivo é nulo.
  - *Backfill* não destrutivo: negociações já fechadas recebem `pendente`.
- **Histórico:** o gatilho de histórico passa a registrar `status_execucao`, `data_execucao_realizada` e `motivo_cancelamento_execucao` (por `create or replace` da função).
- `vw_negociacoes` ganha as três colunas no fim (`create or replace view`).
- **Quem registra:** o vendedor dono (as políticas de UPDATE atuais). A gestora só lê.
- Função `public.negociacoes_execucao_mes(p_ano int, p_mes int) returns setof vw_negociacoes`, *security invoker*, `search_path` vazio. Devolve as negociações fechadas que:
  - foram realizadas com `data_execucao_realizada` no mês; **ou**
  - estão pendentes com `data_execucao_prevista` no mês; **ou**
  - foram canceladas com `data_execucao_prevista` no mês.
- **Atrasada** é uma regra de tela: pendente com execução prevista anterior a hoje (fuso de São Paulo).
- Ação: `registrarExecucao(prev: EstadoForm, fd: FormData): Promise<EstadoForm>`.
  - Campos: `id`, `status_execucao`, `data_execucao_realizada`, `data_execucao_prevista`, `motivo_cancelamento_execucao`.
  - Formulário no detalhe da negociação, só para o dono e só se `status = fechou` (`data-testid="registrar-execucao"`; status exibido em `execucao-status`).
- Tela `/relatorio/execucao?mes=` (`relatorio-execucao`), com os indicadores:
  - realizadas no mês e valor executado (`ind-realizadas`);
  - pendentes previstas para o mês (`ind-pendentes`);
  - atrasadas (`ind-atrasadas`);
  - canceladas (`ind-canceladas`).
- O mês do relatório de **vendas** não muda.

### M2 — Ações comerciais (P1) — **PROVISÓRIO H-A**
- Enums `public.tipo_acao`: `ligacao | mensagem | visita | proposta | follow_up | outro`; `public.situacao_acao`: `planejada | realizada | cancelada`.
- Tabela `public.acoes_venda`:
  - `id uuid pk`;
  - `cliente_id` obrigatório (FK);
  - `negociacao_id` opcional (FK), que **deve ser do mesmo cliente**;
  - `vendedor_id` = **responsável**, padrão `auth.uid()`, que deve ser o dono do cliente;
  - `tipo`, `situacao` (padrão `planejada`);
  - `data_prevista date` (obrigatória se planejada) e `data_realizada date` (obrigatória se realizada);
  - `descricao text` obrigatória (1 a 2000 caracteres) e `resultado text`;
  - `motivo_cancelamento text` (obrigatório se cancelada);
  - `criado_em` e `atualizado_em`.
- Cliente, negociação e responsável não podem mudar depois de criados.
- RLS igual à das negociações: o vendedor cria, lê e edita as próprias; a gestora lê todas; sem DELETE.
- Histórico em `public.historico_acoes`, com o mesmo padrão de `historico_negociacoes`: criação e mudanças de situação e de datas.
- `public.vw_acoes` (*security_invoker*), com `cliente_nome`, `vendedor_nome` e `negociacao_rotulo` (serviço · unidade).
- Função `public.acoes_mes(p_ano int, p_mes int) returns setof vw_acoes`, *security invoker*. Devolve:
  - as **realizadas** com `data_realizada` no mês;
  - as **planejadas** e as **canceladas** com `data_prevista` no mês.
- O **relatório mensal de ações distingue planejadas e realizadas** (canceladas à parte): totais por situação, por tipo e por responsável.
- Ações: `criarAcao(prev, fd)` (campos `cliente_id`, `negociacao_id?`, `tipo`, `situacao`, `data_prevista?`, `data_realizada?`, `descricao`, `resultado?`) e `atualizarAcao(prev, fd)` (campos `id`, `situacao`, `data_prevista?`, `data_realizada?`, `resultado?`, `motivo_cancelamento?`).
- Telas:
  - `/acoes?mes=AAAA-MM` (`acoes-mes`), com os indicadores `ind-acoes-planejadas`, `ind-acoes-realizadas` e `ind-acoes-canceladas`;
  - `/acoes/[id]` (detalhe e atualização);
  - `/clientes/[id]/acoes/nova` (`nova-acao`).
- Componente `ProximasAcoes`, que lista as planejadas a partir de hoje (`proximas-acoes`), para a ficha do cliente.

### M3 — Conversas (P1) — **PROVISÓRIO H-C**
- Enum `public.canal_conversa`: `whatsapp | instagram | telefone | email | presencial | outro`.
- Tabela `public.conversas`:
  - `id`, `cliente_id` obrigatório, `negociacao_id` opcional (do mesmo cliente);
  - `vendedor_id` = dono do cliente;
  - `registrada_por` (padrão `auth.uid()`), `canal`, `ocorrida_em timestamptz` obrigatório;
  - `conteudo text` (1 a 20 000 caracteres);
  - `substitui_conversa_id uuid` (FK para `conversas`, **UNIQUE**) e `motivo_correcao text` (obrigatório se houver substituição);
  - `criado_em`.
- **Imutável:** sem políticas de UPDATE ou DELETE. **Correção = nova linha** que aponta para a anterior com `substitui_conversa_id`. A anterior é preservada e cada versão só pode ser substituída uma vez (UNIQUE).
- A correção deve ter o mesmo cliente e o mesmo vendedor da original.
- `public.vw_conversas` (*security_invoker*) com cliente, vendedor, `versao_atual boolean` (ninguém a substitui) e `foi_corrigida boolean`. As listas mostram só as versões atuais, e o detalhe mostra a cadeia de versões.
- Tabela `public.analises_conversa`: `id`, `conversa_id` (FK), `gestora_id` (padrão `auth.uid()`), `comentario text` (1 a 5000), `criado_em`.
  - **Só a gestora** insere e lê. **O vendedor não vê análises.** Sem UPDATE ou DELETE.
- RLS de `conversas`: o vendedor lê e cria as próprias (o `vendedor_id` dele, cliente dele); a gestora lê todas e **não cria conversa**.
- Ações: `registrarConversa(prev, fd)` (campos `cliente_id`, `negociacao_id?`, `canal`, `ocorrida_em`, `conteudo`), `corrigirConversa(prev, fd)` (campos `substitui_conversa_id`, `canal`, `ocorrida_em`, `conteudo`, `motivo_correcao`) e `registrarAnalise(prev, fd)` (campos `conversa_id`, `comentario`).
- Telas:
  - componente `ConversasCliente` (`conversas-cliente`), para a ficha do cliente;
  - `/clientes/[id]/conversas/nova` (`nova-conversa`);
  - `/conversas` (`lista-conversas`): a gestora vê todas, com filtros por vendedor, canal e período; o vendedor vê as próprias;
  - `/conversas/[id]`, com o conteúdo (`conversa-conteudo`), as versões, o botão "Corrigir" (só o dono, só na versão atual) e as análises com o formulário "Registrar análise" (`nova-analise`) **só para a gestora**.

### M6 — Painel gerencial mínimo (P1)
- A tela inicial da gestora passa a ser `/painel?mes=AAAA-MM` (`painel`). O vendedor continua indo para `/clientes`.
- Cards do mês, cada um com link para o detalhe:
  - vendas fechadas, valor e conversão (do relatório de vendas);
  - execuções realizadas, pendentes e atrasadas (do relatório de execução);
  - ações realizadas e planejadas (das ações do mês);
  - conversas registradas no mês.
- Tabela por vendedor: vendas, valor, ações realizadas e execuções realizadas.
- Usa só as funções SQL acima; nenhuma tabela nova. O vendedor que acessa `/painel` recebe 404.

## 3. Pontos de integração (donos únicos)

| Ponto | Dono | Como |
|---|---|---|
| Esquema SQL de M1, M2 e M3 + `database.types.ts` | A (onda 1) | Migração `20261113100000_execucao_acoes_conversas.sql` |
| Menu (`src/app/(app)/layout.tsx`), tela inicial (`src/app/(app)/page.tsx`), ficha do cliente (`clientes/[id]/page.tsx`, que monta `ProximasAcoes` e `ConversasCliente`) | Coordenador (na integração) | Edições pequenas após o merge |
| `data-testid` | quem constrói a tela | Conforme esta especificação |

## 4. Decisões registradas (13/11/2026)
- **Aprovadas como provisórias:** H-E (execuções), H-A (ações), H-C (conversas; análise invisível ao vendedor; correção preserva a anterior).
- M6 painel mínimo passa a P1. Configurações, paginação e filtros extras, P2.
- Commits e merges **locais** autorizados na `vnnitz237/crm-veronica-planejamento`. Proibido: push, `main`, deploy, produção, migrações destrutivas, exclusão de dados.
- No máximo **2 agentes em tarefa pesada** simultânea; ampliar só após medir memória e estabilidade.
- **Decisão técnica do coordenador (rotina):** a partir da onda 2, a divisão passa a ser por **módulo vertical** (tela e ação do mesmo módulo com um só agente), para eliminar dependência de compilação entre agentes. A propriedade exclusiva de arquivos continua valendo (ver `agent-ownership.md`).

As decisões comerciais da cliente (1 a 14 do README) continuam abertas.
