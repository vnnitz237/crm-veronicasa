/** Aceite M5 (edição de cliente) e M4 (CSV de vendas). */
import { expect, test } from "@playwright/test";
import { CLIENTES, USUARIOS } from "../fixtures";
import { clienteAdmin } from "../supabase";
import { Criados, entrar, esperar404 } from "./apoio";

const criados = new Criados();
test.afterAll(() => criados.limpar());

async function lerCsv(page: import("@playwright/test").Page, mes: string) {
  const r = await page.request.get(`/relatorio/vendas.csv?mes=${mes}`);
  expect(r.status()).toBe(200);
  const bytes = await r.body();
  return { bytes, texto: bytes.toString("utf8") };
}

test.describe("M5 — edição de cliente", () => {
  test("AC-M5-1/2: Paula edita nome, e-mail, observações e telefone (gravado canônico)", async ({ page }) => {
    const id = await criados.cliente("paula", "QA Edição Original");
    await entrar(page, "paula");
    await page.goto(`/clientes/${id}`);
    await page.getByTestId("editar-cliente").click();
    await expect(page).toHaveURL(new RegExp(`/clientes/${id}/editar$`));
    const novoNome = `QA Edição ${Date.now().toString().slice(-5)}`;
    const tel = `+55 (11) 9${String(Math.floor(Math.random() * 1e4)).padStart(4, "0")}-${String(Math.floor(Math.random() * 1e4)).padStart(4, "0")}`;
    await page.getByLabel("Nome *").fill(novoNome);
    await page.getByLabel("E-mail").fill("qa-edicao@exemplo.test");
    await page.getByLabel("Observações").fill("Observação editada pelo QA");
    await page.getByLabel("Telefone (com DDD) *").fill(tel);
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(page).toHaveURL(new RegExp(`/clientes/${id}$`));
    await expect(page.getByTestId("cliente-nome")).toHaveText(novoNome);
    await expect(page.getByText("qa-edicao@exemplo.test")).toBeVisible();
    await expect(page.getByText("Observação editada pelo QA")).toBeVisible();

    const { data } = await clienteAdmin().from("clientes").select("nome, email, observacoes, telefone").eq("id", id).single();
    expect(data).toMatchObject({ nome: novoNome, email: "qa-edicao@exemplo.test", observacoes: "Observação editada pelo QA" });
    expect(data!.telefone).toBe(tel.replace(/\D/g, "").slice(2));
  });

  test("AC-M5-2 (literal): +55 (11) 97777-0000 grava 11977770000", async ({ page }) => {
    const admin = clienteAdmin();
    const { data: ocupado } = await admin.from("clientes").select("id").eq("telefone", "11977770000");
    test.skip(!!ocupado?.length, "telefone 11977770000 já usado no banco");
    const id = await criados.cliente("paula", "QA Telefone Literal");
    await entrar(page, "paula");
    await page.goto(`/clientes/${id}/editar`);
    await page.getByLabel("Telefone (com DDD) *").fill("+55 (11) 97777-0000");
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(page).toHaveURL(new RegExp(`/clientes/${id}$`));
    const { data } = await admin.from("clientes").select("telefone").eq("id", id).single();
    expect(data!.telefone).toBe("11977770000");
  });

  test("AC-M5-3: telefone de cliente de outro vendedor → mensagem genérica e nada muda", async ({ page }) => {
    const id = await criados.cliente("paula", "QA Duplicidade");
    const { data: antes } = await clienteAdmin().from("clientes").select("*").eq("id", id).single();
    await entrar(page, "paula");
    await page.goto(`/clientes/${id}/editar`);
    await page.getByLabel("Telefone (com DDD) *").fill("+55 (11) 90000-0003"); // Juliana (Rafael)
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(page.getByText("Já existe um cliente com este telefone.", { exact: false })).toBeVisible();
    await expect(page.getByText("Juliana Prado")).toHaveCount(0);
    const { data: depois } = await clienteAdmin().from("clientes").select("*").eq("id", id).single();
    expect(depois).toEqual(antes);
  });

  test("AC-M5-4: Rafael recebe 404 na edição do Marcos; POST forjado não altera", async ({ page }) => {
    const { data: antes } = await clienteAdmin().from("clientes").select("*").eq("id", CLIENTES.marcos).single();
    await entrar(page, "rafael");
    await page.goto(`/clientes/${CLIENTES.marcos}/editar`);
    await esperar404(page);
    await expect(page.getByText("Marcos Teixeira")).toHaveCount(0);

    // POST forjado: Rafael usa o formulário de edição do próprio cliente trocando o id pelo do Marcos.
    await page.goto(`/clientes/${CLIENTES.juliana}/editar`);
    await page.locator('input[name="id"]').evaluate((el, v) => ((el as HTMLInputElement).value = v), CLIENTES.marcos);
    await page.getByLabel("Nome *").fill("Invadido pelo Rafael");
    await page.getByLabel("Telefone (com DDD) *").fill("11900000003");
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(page.getByText("Cliente não encontrado.")).toBeVisible();
    const { data: depois } = await clienteAdmin().from("clientes").select("*").eq("id", CLIENTES.marcos).single();
    expect(depois).toEqual(antes);
  });

  test("AC-M5-5: gestora não vê Editar e recebe 404 na rota", async ({ page }) => {
    await entrar(page, "veronica");
    await page.goto(`/clientes/${CLIENTES.marcos}`);
    await expect(page.getByTestId("cliente-nome")).toHaveText("Marcos Teixeira");
    await expect(page.getByTestId("editar-cliente")).toHaveCount(0);
    await page.goto(`/clientes/${CLIENTES.marcos}/editar`);
    await esperar404(page);
  });
});

test.describe("M4 — CSV do relatório de vendas", () => {
  test("AC-M4-1/3: gestora — CSV de outubro = linhas da tela; formato Excel pt-BR", async ({ page }) => {
    await entrar(page, "veronica");
    await page.goto("/relatorio?mes=2026-10");
    await expect(page.getByTestId("exportar-csv")).toBeVisible();
    const linhasTela = await page.getByTestId("relatorio-detalhe").locator("tbody tr").count();
    const { bytes, texto } = await lerCsv(page, "2026-10");

    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const linhas = texto.replace(/^﻿/, "").split("\r\n").filter(Boolean);
    expect(linhas[0]).toBe("Cliente;Serviço;Unidade;Vendedor(a);Resultado;Data da venda/recusa;Motivo;Execução prevista;Valor");
    expect(linhas.length - 1).toBe(linhasTela);
    expect(texto).toContain("Avaliação Completa"); // acentos legíveis
    expect(texto).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(texto).not.toMatch(/\d{4}-\d{2}-\d{2}/);

    const fechadas = linhas.slice(1).map((l) => l.split(";")).filter((c) => c[4] === "Fechou");
    const soma = fechadas.reduce((s, c) => s + Number(c[8].replace(/\./g, "").replace(",", ".")), 0);
    // Totais conferidos contra os indicadores da própria tela (o seed sozinho dá 3 linhas e 2000,00).
    expect(fechadas.length).toBe(Number(await page.getByTestId("ind-fechadas").innerText()));
    const valorTela = (await page.getByTestId("ind-valor").innerText()).replace(/[^\d,]/g, "").replace(",", ".");
    expect(soma).toBeCloseTo(Number(valorTela), 2);
    expect(linhas.find((l) => l.startsWith("Marcos Teixeira;Pacote Mensal"))).toContain("1200,00");
  });

  test("AC-M4-2: CSV do Rafael (outubro) só tem venda dele", async ({ page }) => {
    await entrar(page, "rafael");
    const { texto } = await lerCsv(page, "2026-10");
    const linhas = texto.replace(/^﻿/, "").split("\r\n").filter(Boolean).slice(1);
    expect(linhas.length).toBeGreaterThan(0);
    for (const l of linhas) expect(l.split(";")[3]).toBe(USUARIOS.rafael.nome);
    expect(texto).not.toContain("Marcos Teixeira");
  });

  test("AC-M4-4: nome com fórmula sai com prefixo de apóstrofo", async ({ page }) => {
    const id = await criados.cliente("paula", '=HYPERLINK("x")');
    await criados.vendaFechada("paula", id, "2026-10-29", null, 10);
    await entrar(page, "paula");
    const { texto } = await lerCsv(page, "2026-10");
    expect(texto).toContain(`'=HYPERLINK(""x"")`);
    expect(texto).not.toMatch(/(^|;|\r\n)"?=HYPERLINK/);
  });

  test("AC-M4-5: sem sessão → 401 sem dados", async ({ request }) => {
    for (const rota of ["/relatorio/vendas.csv?mes=2026-10", "/relatorio/execucao.csv?mes=2026-11"]) {
      const r = await request.get(rota, { maxRedirects: 0 });
      expect(r.status()).toBe(401);
      const corpo = await r.text();
      expect(corpo).not.toContain("Marcos");
      expect(corpo).not.toContain("Juliana");
    }
  });
});
