# CRM Verônica Sá — MVP consolidado (Etapa 1)

Next.js 16 (App Router, Server Actions) + Supabase (PostgreSQL, Auth e RLS).
**Todos os dados são fictícios.** Ambiente pensado para rodar localmente.

## Requisitos consolidados

**Vendedor(a)**
- informações centralizadas por cliente;
- cadastro de clientes;
- ações de vendas do mês;
- por venda: serviço, unidade, data da venda, data de execução do serviço e status *fechou / não fechou*;
- relatório mensal.

**Gestor(a)**
- acesso aos dados de todos os vendedores;
- relatório de vendas;
- acesso e análise das conversas.

## Situação

| Requisito | Situação |
|---|---|
| Cadastro de clientes, com telefone canônico e único | ✅ Implementado |
| Negociações (serviço, unidade, valor, status, data da venda, execução prevista) | ✅ Implementado |
| "Não fechou" limpa a execução prevista (banco + histórico) | ✅ Implementado |
| Histórico de alterações com autor e horário | ✅ Implementado |
| Relatório mensal (vendedor vê o próprio; gestora vê todos, por vendedor) | ✅ Implementado |
| Isolamento por RLS; gestora lê tudo sem editar | ✅ Implementado |
| Ações comerciais do mês e próximas ações | ⏳ Etapa 2 |
| Execução realizada x prevista e relatório de execução | ⏳ Etapa 3 |
| Conversas (histórico manual) e análise pela gestora | ⏳ Etapa 4 |
| Integrações externas (WhatsApp, e-mail etc.) | ⏳ Etapa 5, só após decisão |

## Roteiro de etapas

1. **Etapa 1 — Consolidação do MVP** (esta): base estável, documentação, verificações (typecheck, lint, build, testes) e primeiro commit.
2. **Etapa 2 — Ações comerciais:** ações de vendas do mês por vendedor e próximas ações por cliente/negociação.
3. **Etapa 3 — Execução:** data de execução realizada ao lado da prevista e relatório de execução.
4. **Etapa 4 — Conversas:** registro manual do histórico de conversas e regras de acesso/análise da gestora.
5. **Etapa 5 — Integrações externas:** avaliar somente depois de decisões explícitas sobre canais, APIs, permissões e custos.

Regras gerais: apenas Supabase local e dados fictícios; nenhum serviço externo nem dado real até decisão em contrário.

## Pré-requisitos

- Node 24+ e npm
- Docker em execução (o Supabase local roda em containers)

O Supabase CLI vem como dependência do projeto (`npx supabase`), não é preciso instalá-lo globalmente.

## Como rodar

```bash
npm install
npx playwright install chromium   # só para os testes de navegador
npm run setup                     # sobe o Supabase local (portas 545xx) e gera .env.local
npm run dev                       # http://localhost:3000
```

| Perfil | E-mail | Senha |
|---|---|---|
| Vendedora | paula@exemplo.test | demo-crm-2026 |
| Vendedor | rafael@exemplo.test | demo-crm-2026 |
| Gestora | veronica@exemplo.test | demo-crm-2026 |

Outros comandos:

```bash
npm run db:reset    # recria o banco: migração + dados fictícios
npm test            # db:reset + unitários + integração (RLS) + ponta a ponta (Playwright)
npm run test:unit   # regras de cálculo e validação
npm run test:db     # cenários de aceite direto no banco, autenticado como cada usuário
npm run test:e2e    # navegador, contra o build de produção na porta 3100
npm run typecheck && npm run lint
npm run db:stop     # desliga o Supabase local
```

## Roteiro de demonstração (~5 min)

Comece com `npm run db:reset` para partir dos dados fictícios.

**1. Vendedora — Paula**
1. Entre como `paula@exemplo.test`. A tela inicial é **Clientes**: ela vê só os próprios clientes (Marcos e Beatriz).
2. **Novo cliente** → "Fernanda Rocha", telefone `(11) 98888-0001`, origem Instagram → **Salvar cliente**.
3. Na ficha da cliente → **Nova negociação** → serviço *Consultoria Inicial*, *Unidade Sul*, valor `650,00` → **Criar negociação**.
4. Em **Registrar resultado** → **Fechou** → data da venda `31/10/2026`, execução prevista `12/11/2026` → **Salvar resultado**. O status muda para *Fechou* e o histórico registra a mudança.
5. **Relatório mensal** → outubro de 2026: a venda da Fernanda aparece ao lado das demais vendas da Paula.

**2. Isolamento — Rafael**
1. Copie a URL da negociação da Fernanda, clique em **Sair** e entre como `rafael@exemplo.test`.
2. Cole a URL: aparece **"Registro não encontrado"**, a mesma resposta de um registro inexistente.
3. Em Clientes ele vê só Juliana e Carlos. O relatório de outubro mostra só a venda dele.

**3. Gestora — Verônica**
1. Entre como `veronica@exemplo.test`. A tela inicial é o **Relatório mensal**.
2. Cole a URL da negociação da Fernanda: os dados aparecem completos, sem o formulário de edição (a gestora só consulta).
3. **Relatório → outubro de 2026**: 3 vendas fechadas, R$ 2.650,00, 1 não fechada, conversão 75%. A tabela **Por vendedor(a)** mostra Paula e Rafael.
   - A venda do Marcos (fechada em 28/10, com execução prevista para 04/11) está em **outubro**.
4. **Próximo →** (novembro): nem a venda do Marcos nem a da Fernanda aparecem. Aparece só a venda da Juliana, fechada em 03/11.
5. **Clientes → Marcos Teixeira**: duas negociações separadas, *Pacote Mensal / Centro — Fechou* e *Avaliação Completa / Norte — Não fechou*.

## Como está organizado

```
supabase/migrations/…_fundacao.sql  schema, gatilhos, view, função do relatório e RLS
supabase/seed.sql                   2 vendedores, 1 gestora, unidades, serviços, clientes e negociações fictícios
src/proxy.ts                        renova a sessão e manda para /login quem não está logado
src/lib/auth.ts                     usuário atual + perfil
src/lib/relatorio.ts                consolidação dos indicadores do mês (testada)
src/app/(app)/…                     telas: clientes, negociações, relatório
tests/unit | tests/integracao | tests/e2e
```

### Regras implementadas

- **A venda é a negociação.** Cada negociação tem exatamente 1 serviço e 1 unidade, com status, valor e datas próprios. Um cliente pode ter várias negociações e os resultados não se misturam.
- **Status:** *em negociação*, *fechou* ou *não fechou*.
  - *Fechou* exige a data da venda.
  - *Não fechou* exige a data da recusa e o motivo.
  - A execução prevista não pode ser anterior à venda.
  - Essas regras são checadas no banco, não apenas na tela.
- **Acesso (RLS no Postgres):**
  - o vendedor lê e edita só o que é dele;
  - a gestora lê tudo e não edita registros dos vendedores;
  - ninguém exclui pela aplicação;
  - quem não está logado não acessa nada;
  - o cadastro público de usuários está desligado.
- **Telefone (regra provisória: único em toda a base):**
  - Cadastro e edição gravam a **chave canônica**: só dígitos, sem o DDI 55. Ou seja, `+55 (11) 90000-0001`, `5511900000001` e `(11) 90000-0001` são o mesmo telefone.
  - O 55 só é removido quando o número tem 12 ou 13 dígitos (55 + DDD + 8 ou 9). Números locais nunca mudam: `(11) 9000-0001` (8 dígitos) e `(11) 90000-0001` (9 dígitos) continuam diferentes, e o DDD 55 é preservado.
  - Só são aceitos DDD + 8 ou 9 dígitos. Quem tenta cadastrar um telefone existente recebe a mesma mensagem genérica, sem saber de quem é o cliente.
  - Tudo isso é garantido no banco (`garantir_telefone_canonico`), inclusive contra cadastros simultâneos.
- **Telefones já gravados antes da correção:** a migração `…_telefone_canonico_e_recusa_sem_execucao.sql` executa `reconciliar_telefones()`:
  - números com +55 sem conflito são apenas normalizados;
  - se a normalização revelar duplicatas, **nenhum registro é apagado nem mesclado**: os clientes envolvidos ficam com `telefone_em_revisao = true` e entram em `conflitos_telefone`, com o telefone original;
  - telefones em formato inválido ficam preservados como estavam e também entram na lista;
  - a gestora consulta `conflitos_telefone`, e as telas mostram o selo **"Telefone em revisão"**;
  - a marcação é exclusiva da administração, e um novo cadastro com uma chave em revisão continua bloqueado.
- **"Não fechou" não tem execução prevista:** ao mudar para *Não fechou*, a data de execução prevista é limpa na mesma operação. O banco faz isso mesmo que a requisição não peça (gatilho), uma restrição impede o contrário e o histórico registra a mudança com o autor. Registros antigos nessa situação foram limpos pela migração e registrados no histórico como alteração do sistema.
- **Histórico:** criação e mudanças de status, valor, datas, serviço e unidade, com autor e horário.
- **Relatório mensal (hipótese provisória H3):** a venda entra no mês da **data da venda**; a recusa entra no mês da data da recusa; a data de execução não muda o mês. A conversão é fechadas ÷ (fechadas + não fechadas).

### Decisões que ainda dependem da cliente

O comportamento atual é provisório até a cliente confirmar cada ponto.

| # | Decisão | Como está hoje |
|---|---|---|
| 1 | O telefone é único em toda a base ou só por vendedor? Pode haver telefone compartilhado, como o de uma família? | Único em toda a base |
| 2 | O que fazer quando o cliente já pertence a outro vendedor: avisar o responsável, transferir, ou a gestão decide? | Bloqueia com mensagem genérica e orienta a falar com a gestão |
| 3 | Como resolver telefones em revisão (manter um, corrigir o número, mesclar clientes) e quem pode fazer isso | Ficam marcados; a resolução é manual, sem tela |
| 4 | Números estrangeiros, ou antigos de 8 dígitos que hoje têm 9 | Só DDD + 8 ou 9 dígitos; 8 e 9 dígitos são números diferentes |
| 5 | A recusa conta pela data em que aconteceu ou pela data do registro? A conversão olha o mês do resultado ou o mês de início da negociação? | Conta pela data da recusa informada (o padrão é hoje), no mês do resultado |
| 6 | Meses encerrados podem mudar quando alguém altera um resultado ou uma data? | Podem; a mudança fica só no histórico |
| 7 | Aceitar venda ou recusa em data futura, ou recusa anterior à criação da negociação? | Aceita |
| 8 | Uma venda fechada pode virar "Não fechou"? Ela some do mês original ou aparece como cancelamento? | Pode; sai do mês da venda e entra no mês da recusa |
| 9 | Reabrir uma negociação recusada deve recuperar a execução prevista? | Não; a execução precisa ser informada de novo ao fechar |
| 10 | Negociações em aberto entram no relatório mensal como pipeline? | Não entram |

Decisões também pendentes para as próximas etapas:

| # | Decisão | Etapa |
|---|---|---|
| 11 | O que é uma "ação de venda do mês" (meta, campanha, tarefa por cliente?) e quem a cria | 2 |
| 12 | Execução realizada: quem registra, e se pode diferir da unidade/serviço vendidos | 3 |
| 13 | Conversas: quais canais, quem registra, o que a gestora pode ver/anotar, retenção e LGPD | 4 |
| 14 | Integrações: quais canais/APIs, permissões, consentimento e custos | 5 |

### Fora de escopo (Etapa 1)

- Ações comerciais, conversas, relatório de execução (etapas 2 a 4).
- Integrações com serviços externos e uso de dados reais.
- Exportação CSV, painel avançado, cadastro de usuários/serviços/unidades pela tela e edição de dados do cliente.
- Deploy em ambiente remoto.
