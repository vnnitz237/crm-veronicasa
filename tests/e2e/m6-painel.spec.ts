/** Aceite M6 — painel gerencial mínimo. Os números são conferidos contra as próprias telas de detalhe. */
import { expect, test } from "@playwright/test";
import { USUARIOS } from "../fixtures";
import { entrar, esperar404, hojeSP, mesDe, numero } from "./apoio";

const MESES = ["2026-10", "2026-11", mesDe(hojeSP())];

test("AC-M6-1: gestora cai em /painel e os cards batem com os relatórios do mês", async ({ page }) => {
  await entrar(page, "veronica");
  await expect(page).toHaveURL(/\/painel$/);
  await expect(page.getByTestId("painel")).toBeVisible();

  for (const mes of [...new Set(MESES)]) {
    await page.goto(`/painel?mes=${mes}`);
    const cardVendas = await page.getByTestId("card-vendas").innerText();
    const cardExec = await page.getByTestId("card-execucoes").innerText();
    const cardAcoes = await page.getByTestId("card-acoes").innerText();
    await expect(page.getByTestId("card-conversas")).toBeVisible();
    const vendas = await numero(page, "card-vendas");
    const nums = (t: string) => (t.match(/\d+/g) ?? []).map(Number);

    await page.goto(`/relatorio?mes=${mes}`);
    expect(vendas).toBe(await numero(page, "ind-fechadas"));
    const valor = (await page.getByTestId("ind-valor").innerText()).replace(/\s/g, " ");
    expect(cardVendas.replace(/\s/g, " ")).toContain(valor);

    await page.goto(`/relatorio/execucao?mes=${mes}`);
    const [realizadas, pendentes, atrasadas] = [await numero(page, "ind-realizadas"), await numero(page, "ind-pendentes"), await numero(page, "ind-atrasadas")];
    expect(nums(cardExec).slice(0, 3)).toEqual([realizadas, pendentes, atrasadas]);

    await page.goto(`/acoes?mes=${mes}`);
    expect(nums(cardAcoes).slice(0, 2)).toEqual([await numero(page, "ind-acoes-realizadas"), await numero(page, "ind-acoes-planejadas")]);
  }
});

test("AC-M6-1 (links): cada card leva ao detalhe do mesmo mês", async ({ page }) => {
  await entrar(page, "veronica");
  const mes = "2026-11";
  for (const [card, destino] of [["card-vendas", "/relatorio"], ["card-execucoes", "/relatorio/execucao"], ["card-acoes", "/acoes"], ["card-conversas", "/conversas"]] as const) {
    await page.goto(`/painel?mes=${mes}`);
    await page.getByTestId(card).click();
    await expect(page).toHaveURL(new RegExp(`${destino.replace(/\//g, "\\/")}\\?mes=${mes}$`));
  }
});

test("AC-M6-2: tabela por vendedor mostra Paula e Rafael com vendas, valor, ações e execuções", async ({ page }) => {
  await entrar(page, "veronica");
  await page.goto("/painel?mes=2026-10");
  const t = page.getByTestId("painel-por-vendedor");
  await expect(t.locator("thead")).toContainText("Vendas");
  await expect(t.locator("thead")).toContainText("Valor");
  await expect(t.locator("thead")).toContainText("Ações realizadas");
  await expect(t.locator("thead")).toContainText("Execuções realizadas");
  await expect(t.getByRole("row", { name: new RegExp(USUARIOS.paula.nome) })).toBeVisible();
  await expect(t.getByRole("row", { name: new RegExp(USUARIOS.rafael.nome) })).toBeVisible();
  // Seed: Rafael realizou a execução da Juliana em 20/10 e Paula fez a ligação de 25/10.
  const rafael = (await t.getByRole("row", { name: new RegExp(USUARIOS.rafael.nome) }).innerText()).split("\t");
  expect(Number(rafael.at(-1))).toBeGreaterThanOrEqual(1);
  const paula = (await t.getByRole("row", { name: new RegExp(USUARIOS.paula.nome) }).innerText()).split("\t");
  expect(Number(paula.at(-2))).toBeGreaterThanOrEqual(1);
});

test("AC-M6-3: vendedor recebe 404 em /painel e entra em /clientes", async ({ page }) => {
  for (const quem of ["paula", "rafael"] as const) {
    await entrar(page, quem);
    await expect(page).toHaveURL(/\/clientes$/);
    await page.goto("/painel");
    await esperar404(page);
  }
});

test("DEFEITO D2-01 (P2): o card de conversas leva a /conversas?mes=, mas a lista ignora o mês", async ({ page }) => {
  test.fail(true, "Conhecido: /conversas só filtra por de/até; o parâmetro mes do link do painel é ignorado.");
  await entrar(page, "veronica");
  await page.goto("/conversas?mes=2026-10");
  // Juliana (seed) conversou em 02/11: não deveria aparecer em outubro.
  await expect(page.getByTestId("lista-conversas")).not.toContainText("Juliana Prado", { timeout: 3000 });
});
