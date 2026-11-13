# Relatório B2 — M2 Ações + M3 Conversas (Agente B)

## 1. Arquivos (todos novos, dentro da propriedade de B)
- `src/lib/acoes.ts` (puro: rótulos, totais por situação, por tipo, por responsável)
- `src/lib/conversas.ts` (puro: rótulos de canal, datas em São Paulo, cadeia de versões)
- `src/app/(app)/acoes/actions.ts` — `criarAcao`, `atualizarAcao`
- `src/app/(app)/acoes/page.tsx`, `acoes/[id]/page.tsx`, `acoes/[id]/form.tsx`
- `src/app/(app)/clientes/[id]/acoes/nova/page.tsx`, `form.tsx`
- `src/app/(app)/conversas/actions.ts` — `registrarConversa`, `corrigirConversa`, `registrarAnalise`
- `src/app/(app)/conversas/page.tsx`, `conversas/[id]/page.tsx`, `conversas/[id]/corrigir/page.tsx`
- `src/app/(app)/clientes/[id]/conversas/nova/page.tsx`
- `src/components/acoes/ProximasAcoes.tsx`, `SituacaoAcaoBadge.tsx`
- `src/components/conversas/ConversasCliente.tsx`, `ConversaForm.tsx`, `AnaliseForm.tsx`
- `tests/unit/b-acoes.test.ts`, `tests/unit/b-conversas.test.ts`

## 2. Funcionalidades
**M2 (H-A)**
- `/acoes?mes=AAAA-MM` (`acoes-mes`): usa `acoes_mes`; indicadores `ind-acoes-planejadas` / `ind-acoes-realizadas` / `ind-acoes-canceladas` (separados); navegação ← / mês / →; tabela por tipo (`acoes-por-tipo`); gestora vê a coluna Responsável na lista (`lista-acoes`) e a tabela `acoes-por-responsavel`.
- `/acoes/[id]`: detalhe (`acao-detalhe`); formulário de atualização (`form-atualizar-acao`) só para o responsável; gestora só lê; outros → 404 (RLS + checagem).
- `/clientes/[id]/acoes/nova` (`nova-acao`): só o dono; situação planejada ou realizada; select opcional só com negociações **desse** cliente.
- Ações no servidor: validação espelhando as restrições do banco; erros 42501/23514/23503 traduzidos; vendedor apenas; UPDATE filtrado por `vendedor_id` e zero linhas → "Ação não encontrada.". Ao mudar de situação, `data_realizada` só fica preenchida se realizada e `motivo_cancelamento` só se cancelada.
- `ProximasAcoes({ clienteId, podeCriar })` (`proximas-acoes`): planejadas com `data_prevista >= hojeISO()`, link "Nova ação".

**M3 (H-C)**
- `/conversas` (`lista-conversas`): só `versao_atual`; gestora: todas + filtros vendedor/canal/de/até (`filtros-conversas`, via query string); vendedor: as próprias (RLS) com filtros de canal/período.
- `/conversas/[id]`: `conversa-conteudo` com `whitespace-pre-wrap`; cadeia de versões (`conversa-versoes`) com as anteriores legíveis; aviso e link quando a versão aberta não é a atual; botão "Corrigir" (`corrigir-conversa`) só para o dono na versão atual; seção `analises` + `nova-analise` **só para a gestora** (o vendedor não recebe nem a seção nem a consulta).
- `/conversas/[id]/corrigir` (`corrigir-conversa-form`): só o dono e só a versão atual (senão 404); insere nova linha com `substitui_conversa_id` e motivo obrigatório; a anterior nunca é alterada; 23505 (versão já corrigida) traduzido.
- `/clientes/[id]/conversas/nova` (`nova-conversa`): só o dono.
- `registrarAnalise`: só gestora.
- `ConversasCliente({ clienteId, podeCriar })` (`conversas-cliente`): versões atuais do cliente, link "Registrar conversa".
- `ocorrida_em`: `datetime-local` interpretado como horário de São Paulo (−03:00) e exibido em São Paulo.

## 3. Testes
`npm run typecheck && npm run lint && npm run test:unit && npm run test:db && npm run build`
- typecheck ok · lint ok · unit 32/32 (17 novos em `b-*.test.ts`) · db 42/42 · build ok (rotas novas listadas).
- E2E não executado (restrição de memória). Verificação manual no navegador não feita.

## 4. Para o coordenador montar
- **Menu** (`layout.tsx`): `/acoes` ("Ações") e `/conversas` ("Conversas") — para ambos os perfis.
- **Ficha do cliente** (`clientes/[id]/page.tsx`):
  ```tsx
  import { ProximasAcoes } from "@/components/acoes/ProximasAcoes";
  import { ConversasCliente } from "@/components/conversas/ConversasCliente";
  <ProximasAcoes clienteId={cliente.id} podeCriar={podeEditar} />
  <ConversasCliente clienteId={cliente.id} podeCriar={podeEditar} />
  ```
  (`podeEditar` já existe na ficha: vendedor dono.)
- Rotas novas: `/acoes`, `/acoes/[id]`, `/clientes/[id]/acoes/nova`, `/conversas`, `/conversas/[id]`, `/conversas/[id]/corrigir`, `/clientes/[id]/conversas/nova`.
- `data-testid` extras (além do contrato): `indicadores-acoes`, `acoes-por-tipo`, `acoes-por-responsavel`, `lista-acoes`, `acao-detalhe`, `acao-titulo`, `form-atualizar-acao`, `filtros-conversas`, `conversa-versoes`, `aviso-versao-antiga`, `corrigir-conversa`, `corrigir-conversa-form`, `analises`.

## 5. Riscos / decisões de interpretação (sem regra comercial inventada)
- Nova ação só pode nascer planejada ou realizada: o contrato de `criarAcao` não tem `motivo_cancelamento`, logo "cancelada" na criação seria sempre inválida.
- Não há bloqueio de data realizada no futuro nem de data prevista no passado — a especificação não define; decisão para a cliente.
- A lista de conversas tem limite de 500 linhas (paginação é P2).
- Fuso fixo −03:00 para `ocorrida_em` (Brasil sem horário de verão desde 2019); se voltar, ajustar `lerDataHoraLocal`.
- Nenhum arquivo fora da propriedade de B foi alterado. Sem bloqueios.

## 6. Commits
- `722ff08` — `[B2] M2 Ações comerciais e M3 Conversas: telas, ações e consolidação`
- (este relatório) — `[B2] Relatório`
