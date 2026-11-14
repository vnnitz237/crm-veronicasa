# CRM Verônica Sá — MVP

Next.js 16 (App Router, Server Actions) + Supabase (PostgreSQL, Auth e RLS).
**Todos os dados são fictícios.** Ambiente pensado para rodar localmente. Não há integração externa.

## Requisitos e situação

| Requisito | Situação |
|---|---|
| Cadastro, busca e **edição** de clientes, com telefone canônico e único | ✅ |
| Negociações (serviço, unidade, valor, status, data da venda, execução prevista) e histórico | ✅ |
| **Execuções** (pendente, realizada ou cancelada) e **relatório de execução** — *provisório H-E* | ✅ |
| **Ações comerciais** do mês (planejadas, realizadas e canceladas) e próximas ações — *provisório H-A* | ✅ |
| **Conversas** (registro manual, correção por nova versão) e **análise da gestora** — *provisório H-C* | ✅ |
| Relatório mensal de vendas e **CSV** (vendas e execução) | ✅ |
| **Painel gerencial** mínimo da gestora | ✅ |
| Isolamento por RLS; gestora lê tudo sem editar | ✅ |
| Integrações externas (WhatsApp, e-mail etc.) | ⏳ Só após decisão da cliente |

Documentação técnica em `docs/`: estado atual, especificação, plano, critérios de aceite, relatórios dos agentes e QA.

## Pré-requisitos

- Node 24+ e npm
- Docker em execução (o Supabase local roda em containers)

O Supabase CLI vem como dependência do projeto. Use sempre os scripts npm, que passam pelo *wrapper* `scripts/supabase.mjs`.

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
npm run db:reset    # recria o banco: migrações + dados fictícios
npm test            # db:reset + unitários + banco (RLS) + ponta a ponta (Playwright)
npm run test:unit | test:db | test:e2e
npm run typecheck && npm run lint && npm run build
npm run db:stop     # desliga o Supabase local
```

**Worktrees paralelas** (ambiente isolado): `npm run ambiente:isolado -- <1..4>` grava o slot da worktree, sobe uma pilha Supabase própria (portas 54(5+n)xx) e gera o `.env.local` com `E2E_PORT = 3100 + 100·n`. Sem slot, tudo funciona como acima.

## Roteiro de demonstração (~12 min)

Comece com `npm run db:reset`. As datas dos dados fictícios estão em outubro e novembro de 2026.

**1. Vendedora — Paula**
1. Entre como `paula@exemplo.test`. Em **Clientes** ela vê só os próprios (Marcos e Beatriz).
2. **Novo cliente** → "Fernanda Rocha", telefone `(11) 98888-0001`, origem Instagram → **Salvar**. Na ficha → **Editar** → acrescente uma observação e salve.
3. **Nova negociação** → *Consultoria Inicial*, *Unidade Sul*, `650,00` → **Registrar resultado** → **Fechou**, venda em `31/10/2026`, execução prevista para `12/11/2026`. Como essa previsão já passou, a seção **Execução** aparece como *Atrasada* (continua sendo uma execução pendente).
4. **Clientes → Marcos Teixeira:** a ficha mostra as duas negociações (uma fechada, uma não fechada), as **próximas ações** (acompanhamento em 18/11) e as **conversas** (a de 27/10 aparece já corrigida).
5. Abra a negociação *Pacote Mensal* do Marcos → **Execução → Realizada em 04/11/2026**. O histórico registra a mudança.
6. Na ficha do Marcos → **Nova ação** → ligação, *realizada*, hoje, com descrição. Depois **Registrar conversa** → WhatsApp, data e texto.
7. Abra a conversa nova → **Corrigir** → ajuste o texto e informe o motivo. A versão anterior continua legível na cadeia de versões.
8. **Vendas → outubro de 2026:** a venda da Fernanda aparece; **Exportar CSV** baixa o arquivo para o Excel.

**2. Isolamento — Rafael**
1. Entre como `rafael@exemplo.test` e cole a URL de uma negociação ou conversa da Paula: aparece **"Registro não encontrado"**.
2. Em Clientes, Ações e Conversas ele vê só os registros dele (Juliana e Carlos).

**3. Gestora — Verônica**
1. Entre como `veronica@exemplo.test`. A tela inicial é o **Painel** do mês, com cards de vendas, execuções, ações e conversas, e a tabela por vendedor.
2. **Painel → novembro de 2026.** Só com os dados fictícios originais (logo após o `db:reset`):
   - 1 venda fechada (R$ 1.200,00, da Juliana);
   - execuções: 2 pendentes previstas para o mês (Marcos em 04/11 e Juliana em 10/11), ambas contadas como **atrasadas** a partir de 11/11/2026;
   - ações: 3 planejadas, 1 realizada, 1 cancelada;
   - 1 conversa.

   Os passos da Paula alteram esses números: a execução do Marcos passa a *realizada*, a da Fernanda (12/11) entra como pendente atrasada, e a ação e a conversa novas entram nas contagens.
3. **Vendas → outubro:** as vendas da Paula e do Rafael, com o total por vendedor. A venda do Marcos (fechada em 28/10, executada em 04/11) está em **outubro** em Vendas e em **novembro** em Execução.
4. **Conversas:** filtre por vendedor e canal, abra uma conversa da Paula → **Registrar análise**. Entre de novo como Paula: ela **não vê** a análise.
5. Abra qualquer negociação, ação ou conversa: a gestora consulta tudo, mas não há formulário de edição.

## Como está organizado

```
supabase/migrations/   fundação, telefone canônico/recusa, execuções+ações+conversas (todas aditivas)
supabase/seed.sql      2 vendedores, 1 gestora e dados fictícios de todos os módulos
scripts/               wrapper do Supabase por slot, geração do .env.local
src/proxy.ts           sessão; sem login → /login (CSV → 401)
src/app/(app)/         clientes, negociacoes, acoes, conversas, relatorio (+execucao, CSV), painel
src/lib/               consolidações puras (relatório, execução, painel, ações, conversas, CSV)
tests/                 unit | integracao (RLS e regras) | e2e
docs/                  arquitetura, especificação, plano, QA, relatórios dos agentes
```

## Regras implementadas

- **A venda é a negociação**: 1 serviço e 1 unidade, com resultado próprio. Um cliente pode ter várias.
- **Status da negociação:** *Fechou* exige a data da venda; *Não fechou* exige a data da recusa e o motivo, e limpa a execução. A execução prevista não pode ser anterior à venda. Tudo isso é garantido no banco.
- **Acesso (RLS):**
  - o vendedor lê e edita só o que é dele;
  - a gestora lê tudo e não edita registros dos vendedores;
  - ninguém exclui pela aplicação;
  - quem não está logado não acessa nada;
  - perfil inativo não acessa nada;
  - o cadastro público está desligado.
- **Telefone (provisório):**
  - chave canônica: só dígitos, sem o DDI 55 (+55 e sem +55 são o mesmo número);
  - números de 8 e 9 dígitos continuam distintos;
  - único em toda a base;
  - conflitos legados ficam preservados e marcados como "Telefone em revisão".
- **Histórico** com autor e horário para negociações (inclusive a execução) e ações.
- **Relatório de vendas:** a venda entra no mês da data da venda; a recusa, no mês da data da recusa. Conversão = fechadas ÷ (fechadas + não fechadas). O CSV traz as mesmas linhas.

### Regras PROVISÓRIAS aprovadas para o MVP (dependem de confirmação da cliente)

A implementação usa só migrações aditivas e enums ampliáveis, então ajustes futuros não perdem dados.

- **H-E Execuções:**
  - só negociações fechadas têm execução;
  - status: pendente, realizada ou cancelada;
  - quem registra é o vendedor;
  - "realizada" exige a data, que não pode ser anterior à venda; "cancelada" exige motivo;
  - o relatório de execução usa a data realizada (realizadas) ou a prevista (pendentes e canceladas). *Atrasada* = pendente com previsão anterior a hoje.
- **H-A Ações comerciais:**
  - ligadas a um cliente (e, opcionalmente, a uma negociação dele) e ao responsável;
  - status: planejada, realizada ou cancelada;
  - o relatório mensal separa planejadas, realizadas e canceladas;
  - nada é excluído: a ação é cancelada.
- **H-C Conversas:**
  - registro manual em texto, sem anexos;
  - imutável depois de salva: a correção cria uma nova versão ligada à anterior, que permanece;
  - a gestora registra análises; o vendedor não as vê.

## Decisões que ainda dependem da cliente

| # | Decisão | Como está hoje |
|---|---|---|
| 1 | O telefone é único na base toda ou por vendedor? Pode haver telefone compartilhado? | Único na base toda |
| 2 | O que fazer quando o cliente já pertence a outro vendedor | Bloqueia com mensagem genérica |
| 3 | Como e por quem os telefones em revisão são resolvidos | Marcados; sem tela de resolução |
| 4 | Números estrangeiros; números antigos de 8 dígitos | Só DDD + 8 ou 9 dígitos, tratados como distintos |
| 5 | Mês da recusa e base da conversão | Data da recusa; mês do resultado |
| 6 | Meses encerrados podem mudar? | Podem; fica registrado no histórico |
| 7 | Datas futuras, ou recusa anterior à criação | Aceitas |
| 8 | Uma venda fechada pode virar "Não fechou"? | Pode; sai do mês da venda |
| 9 | Reabrir uma recusa recupera a execução prevista? | Não |
| 10 | Pipeline (negociações em aberto) no relatório | Não entra |
| 11 | Definição de "ação de venda do mês" | **H-A** (provisório) |
| 12 | Execução: quem registra e se pode divergir da venda | **H-E** (provisório): vendedor; mesmo serviço e unidade |
| 13 | Conversas: canais, retenção, LGPD, visibilidade da análise | **H-C** (provisório). **Bloqueia o uso com dados reais** |
| 14 | Integrações externas | Nenhuma |
| 15 | Execuções atrasadas de meses anteriores devem aparecer no relatório do mês corrente? | Aparecem só no mês em que estavam previstas |
| 16 | Ação realizada com data futura, ou planejada com data passada | Aceitas |
| 17 | A coluna Valor do CSV de vendas deve mostrar as recusas? | Mostra, como na tela |
| 18 | A lista de origens do cliente é fechada? | Lista fixa (Instagram, WhatsApp, Indicação, Site, Outro) |

## Fora do MVP (P2)

Configurações pela tela (serviços, unidades, usuários), paginação e filtros extras, resolução de telefones em revisão (decisão 3), melhorias visuais e deploy remoto.
