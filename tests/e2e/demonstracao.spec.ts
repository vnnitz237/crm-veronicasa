/**
 * Roteiro de demonstração ponta a ponta, no navegador.
 * Pré-condição: banco recém-resetado (`npm run db:reset`) — os totais conferidos são os do seed + esta venda.
 */
import { expect, test, type Page } from "@playwright/test";
import { CLIENTES, NEGOCIACOES, SENHA, USUARIOS, telefoneFicticio } from "../fixtures";
import { clienteAdmin } from "../supabase";

test.describe.configure({ mode: "serial" });

const NOME_CLIENTE = `Fernanda Rocha ${Date.now().toString().slice(-5)}`;
let urlCliente = "";
let urlNegociacao = "";

async function entrar(page: Page, quem: keyof typeof USUARIOS) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(USUARIOS[quem].email);
  await page.getByLabel("Senha").fill(SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByTestId("usuario-atual")).toContainText(USUARIOS[quem].nome);
}

test.afterAll(async () => {
  const admin = clienteAdmin();
  const { data } = await admin.from("clientes").select("id").eq("nome", NOME_CLIENTE);
  const ids = (data ?? []).map((c) => c.id);
  if (ids.length) {
    await admin.from("negociacoes").delete().in("cliente_id", ids);
    await admin.from("clientes").delete().in("id", ids);
  }
});

test("sem login, qualquer página leva ao login", async ({ page }) => {
  await page.goto(`/negociacoes/${NEGOCIACOES.marcosPacoteFechouOut}`);
  await expect(page).toHaveURL(/\/login$/);
});

test("login inválido mostra erro", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(USUARIOS.paula.email);
  await page.getByLabel("Senha").fill("senha-errada");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("E-mail ou senha inválidos.")).toBeVisible();
});

test("vendedora: cadastra cliente, cria negociação e marca como fechada", async ({ page }) => {
  await entrar(page, "paula");
  await expect(page).toHaveURL(/\/clientes$/);

  await page.getByRole("link", { name: "Novo cliente" }).click();
  await page.getByLabel("Nome *").fill(NOME_CLIENTE);
  await page.getByLabel("Telefone (com DDD) *").fill(telefoneFicticio());
  await page.getByLabel("Origem").selectOption("Instagram");
  await page.getByRole("button", { name: "Salvar cliente" }).click();
  await expect(page.getByTestId("cliente-nome")).toHaveText(NOME_CLIENTE);
  urlCliente = new URL(page.url()).pathname;

  await page.getByRole("link", { name: "Nova negociação" }).click();
  await page.getByLabel("Serviço *").selectOption({ label: "Consultoria Inicial" });
  await page.getByLabel("Unidade *").selectOption({ label: "Unidade Sul" });
  await page.getByLabel("Valor (R$) *").fill("650,00");
  await page.getByRole("button", { name: "Criar negociação" }).click();
  await expect(page.getByTestId("negociacao-titulo")).toHaveText("Consultoria Inicial · Unidade Sul");
  await expect(page.getByTestId("negociacao-status")).toHaveText("Em negociação");
  urlNegociacao = new URL(page.url()).pathname;

  await page.getByLabel("Fechou", { exact: true }).check();
  await page.getByLabel("Data da venda *").fill("2026-10-31");
  await page.getByLabel("Execução prevista").fill("2026-11-12");
  await page.getByRole("button", { name: "Salvar resultado" }).click();
  await expect(page.getByText("Resultado salvo.")).toBeVisible();
  await expect(page.getByTestId("negociacao-status")).toHaveText("Fechou");
  await expect(page.getByTestId("negociacao-data-venda")).toHaveText("31/10/2026");
  await expect(page.getByText("Status: Em negociação → Fechou")).toBeVisible();

  // Relatório da vendedora (outubro) já mostra a venda.
  await page.goto("/relatorio?mes=2026-10");
  await expect(page.getByTestId("relatorio-detalhe")).toContainText(NOME_CLIENTE);
});

test("outro vendedor não acessa os registros da Paula, nem por URL direta", async ({ page }) => {
  await entrar(page, "rafael");

  for (const url of [urlNegociacao, urlCliente, `/clientes/${CLIENTES.marcos}`, `/negociacoes/${NEGOCIACOES.marcosPacoteFechouOut}`]) {
    await page.goto(url);
    await expect(page.getByRole("heading", { name: "Registro não encontrado" })).toBeVisible();
    await expect(page.getByText(NOME_CLIENTE)).toHaveCount(0);
    await expect(page.getByText("Marcos Teixeira")).toHaveCount(0);
  }

  await page.goto("/clientes");
  await expect(page.getByRole("link", { name: "Juliana Prado" })).toBeVisible();
  await expect(page.getByText("Marcos Teixeira")).toHaveCount(0);
  await expect(page.getByText(NOME_CLIENTE)).toHaveCount(0);

  await page.goto("/relatorio?mes=2026-10");
  await expect(page.getByTestId("relatorio-mes")).toContainText("minhas negociações");
  await expect(page.getByTestId("relatorio-detalhe")).not.toContainText("Marcos Teixeira");
  await expect(page.getByTestId("relatorio-detalhe")).not.toContainText(NOME_CLIENTE);
  await expect(page.getByTestId("ind-fechadas")).toHaveText("1");
});

test("gestora vê a mesma negociação e confere no relatório de outubro", async ({ page }) => {
  await entrar(page, "veronica");
  await expect(page).toHaveURL(/\/painel$/);

  await page.goto(urlNegociacao);
  await expect(page.getByTestId("negociacao-titulo")).toHaveText("Consultoria Inicial · Unidade Sul");
  await expect(page.getByTestId("negociacao-status")).toHaveText("Fechou");
  await expect(page.getByTestId("negociacao-data-venda")).toHaveText("31/10/2026");
  await expect(page.getByText("Vendedor(a): Paula Lima")).toBeVisible();
  // Gestora consulta, não edita.
  await expect(page.getByRole("button", { name: "Salvar resultado" })).toHaveCount(0);

  await page.goto("/relatorio?mes=2026-10");
  const detalhe = page.getByTestId("relatorio-detalhe");
  const linha = detalhe.getByRole("row", { name: new RegExp(NOME_CLIENTE) });
  await expect(linha).toContainText("Paula Lima");
  await expect(linha).toContainText("31/10/2026");
  await expect(linha).toContainText("12/11/2026");
  // Venda do Marcos: fechada em 28/10, execução prevista 04/11 → está em outubro.
  await expect(detalhe.getByRole("row", { name: /Marcos Teixeira.*Pacote Mensal/ })).toContainText("04/11/2026");
  // Seed (2 fechadas, R$ 2.000) + venda da demonstração (R$ 650).
  await expect(page.getByTestId("ind-fechadas")).toHaveText("3");
  await expect(page.getByTestId("ind-valor")).toHaveText(/R\$\s2\.650,00/);
  await expect(page.getByTestId("ind-perdidas")).toHaveText("1");
  await expect(page.getByTestId("grupo-vendedor")).toContainText("Paula Lima");
  await expect(page.getByTestId("grupo-vendedor")).toContainText("Rafael Souza");

  // Novembro não contém nenhuma das duas vendas de outubro.
  await page.goto("/relatorio?mes=2026-11");
  await expect(page.getByTestId("relatorio-detalhe")).not.toContainText(NOME_CLIENTE);
  await expect(page.getByTestId("relatorio-detalhe")).not.toContainText("Marcos Teixeira");
  await expect(page.getByTestId("relatorio-detalhe")).toContainText("Juliana Prado");
});

test("gestora vê o cliente com duas negociações e resultados diferentes", async ({ page }) => {
  await entrar(page, "veronica");
  await page.goto(`/clientes/${CLIENTES.marcos}`);
  const tabela = page.getByTestId("negociacoes-cliente");
  await expect(tabela.getByRole("row", { name: /Pacote Mensal.*Unidade Centro.*Fechou/ })).toBeVisible();
  await expect(tabela.getByRole("row", { name: /Avaliação Completa.*Unidade Norte.*Não fechou/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Nova negociação" })).toHaveCount(0);
});

// --- Regressões da 1ª revisão (rodam depois da conferência dos totais) ---

test("regressão: telefone já cadastrado, digitado com +55, é bloqueado para outro vendedor", async ({ page }) => {
  await entrar(page, "rafael");
  await page.goto("/clientes/novo");
  await page.getByLabel("Nome *").fill("Tentativa duplicada");
  await page.getByLabel("Telefone (com DDD) *").fill("+55 (11) 90000-0001"); // Marcos, cliente da Paula
  await page.getByRole("button", { name: "Salvar cliente" }).click();
  await expect(page.getByText("Já existe um cliente com este telefone.", { exact: false })).toBeVisible();
  await expect(page).toHaveURL(/\/clientes\/novo$/);
  await expect(page.getByText("Marcos Teixeira")).toHaveCount(0);
});

test("regressão: venda revertida para Não fechou perde a execução prevista e o histórico registra", async ({ page }) => {
  await entrar(page, "paula");
  await page.goto(urlNegociacao);
  await expect(page.getByTestId("negociacao-dados")).toContainText("12/11/2026");

  await page.getByLabel("Não fechou", { exact: true }).check();
  await page.getByLabel("Data da recusa *").fill("2026-11-11");
  await page.getByLabel("Motivo *").selectOption("Preço");
  await page.getByRole("button", { name: "Salvar resultado" }).click();
  await expect(page.getByText("Resultado salvo.")).toBeVisible();

  await expect(page.getByTestId("negociacao-status")).toHaveText("Não fechou");
  await expect(page.getByTestId("negociacao-dados")).not.toContainText("12/11/2026");
  await expect(page.getByText("Status: Fechou → Não fechou")).toBeVisible();
  await expect(page.getByText("Execução prevista: 12/11/2026 → —")).toBeVisible();
});
