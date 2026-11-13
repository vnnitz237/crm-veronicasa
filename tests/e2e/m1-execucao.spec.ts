/** Aceite M1 — execuções (provisório H-E). Usa vendas criadas pelo teste; o seed não é alterado. */
import { expect, test, type Page } from "@playwright/test";
import { NEGOCIACOES } from "../fixtures";
import { clienteAdmin } from "../supabase";
import { Criados, entrar, esperar404, hojeSP, mesDe } from "./apoio";

const criados = new Criados();
test.afterAll(() => criados.limpar());

const form = (page: Page) => page.getByTestId("registrar-execucao");

async function salvarExecucao(page: Page, status: "Pendente" | "Realizada" | "Cancelada", campos: { realizada?: string; motivo?: string } = {}) {
  await form(page).getByLabel(status, { exact: true }).check();
  if (campos.realizada !== undefined) await form(page).getByLabel("Data realizada *").fill(campos.realizada);
  if (campos.motivo !== undefined) await form(page).getByLabel("Motivo do cancelamento *").fill(campos.motivo);
  await form(page).getByRole("button", { name: "Salvar execução" }).click();
}

test("AC-M1-1: ao fechar uma venda pela tela, a execução fica pendente", async ({ page }) => {
  const cli = await criados.cliente("paula", `QA Exec Fechar ${Date.now() % 1e5}`);
  const { data: n } = await clienteAdmin().from("negociacoes").insert({
    cliente_id: cli, vendedor_id: "11111111-1111-4111-8111-111111111111",
    servico_id: "b1000000-0000-4000-8000-000000000002", unidade_id: "a1000000-0000-4000-8000-000000000001", valor: 90,
  }).select("id").single();
  criados.negociacoes.push(n!.id);
  await entrar(page, "paula");
  await page.goto(`/negociacoes/${n!.id}`);
  await page.getByLabel("Fechou", { exact: true }).check();
  await page.getByLabel("Data da venda *").fill(hojeSP());
  await page.getByRole("button", { name: "Salvar resultado" }).click();
  await expect(page.getByText("Resultado salvo.")).toBeVisible();
  await expect(page.getByTestId("execucao-status")).toHaveText("Pendente");
  const { data } = await clienteAdmin().from("negociacoes").select("status_execucao").eq("id", n!.id).single();
  expect(data!.status_execucao).toBe("pendente");
});

test("AC-M1-2: realizada em 04/11 (venda 28/10) entra em execução de novembro e continua em vendas de outubro", async ({ page }) => {
  const nome = `QA Exec Nov ${Date.now() % 1e5}`;
  const cli = await criados.cliente("paula", nome);
  const id = await criados.vendaFechada("paula", cli, "2026-10-28", "2026-11-04", 321);
  await entrar(page, "paula");
  await page.goto(`/negociacoes/${id}`);
  await salvarExecucao(page, "Realizada", { realizada: "2026-11-04" });
  await expect(page.getByText("Execução salva.")).toBeVisible();
  await expect(page.getByTestId("execucao-status")).toHaveText("Realizada");
  await expect(page.getByTestId("execucao-realizada")).toHaveText("04/11/2026");
  await expect(page.getByText(/Execução.*Pendente → Realizada|pendente → realizada/i).first()).toBeVisible();

  await page.goto("/relatorio/execucao?mes=2026-11");
  await expect(page.getByTestId("relatorio-execucao-detalhe")).toContainText(nome);
  await page.goto("/relatorio/execucao?mes=2026-10");
  await expect(page.getByTestId("relatorio-execucao-detalhe")).not.toContainText(nome);
  await page.goto("/relatorio?mes=2026-10");
  await expect(page.getByTestId("relatorio-detalhe")).toContainText(nome);
  await page.goto("/relatorio?mes=2026-11");
  await expect(page.getByTestId("relatorio-detalhe")).not.toContainText(nome);
});

test("AC-M1-3: realizada sem data ou antes da venda é recusada (tela e banco)", async ({ page }) => {
  const cli = await criados.cliente("paula", `QA Exec Recusa ${Date.now() % 1e5}`);
  const id = await criados.vendaFechada("paula", cli, "2026-10-28", "2026-11-04");
  await entrar(page, "paula");
  await page.goto(`/negociacoes/${id}`);
  await salvarExecucao(page, "Realizada", { realizada: "2026-10-01" });
  await expect(form(page).getByRole("alert")).toBeVisible();
  await expect(page.getByTestId("execucao-status")).not.toHaveText("Realizada");

  // Sem data: remove o "required" do navegador para chegar ao servidor.
  await page.reload();
  await form(page).getByLabel("Realizada", { exact: true }).check();
  await form(page).getByLabel("Data realizada *").evaluate((el) => { (el as HTMLInputElement).required = false; (el as HTMLInputElement).value = ""; });
  await form(page).getByRole("button", { name: "Salvar execução" }).click();
  await expect(form(page).getByRole("alert")).toBeVisible();
  const { data } = await clienteAdmin().from("negociacoes").select("status_execucao, data_execucao_realizada").eq("id", id).single();
  expect(data).toEqual({ status_execucao: "pendente", data_execucao_realizada: null });
});

test("AC-M1-4/8: cancelar exige motivo; sair de Fechou limpa a execução; histórico com autor", async ({ page }) => {
  const cli = await criados.cliente("paula", `QA Exec Cancela ${Date.now() % 1e5}`);
  const id = await criados.vendaFechada("paula", cli, "2026-10-28", "2026-11-20");
  await entrar(page, "paula");
  await page.goto(`/negociacoes/${id}`);

  await form(page).getByLabel("Cancelada", { exact: true }).check();
  await form(page).getByLabel("Motivo do cancelamento *").evaluate((el) => { (el as HTMLInputElement).required = false; });
  await form(page).getByRole("button", { name: "Salvar execução" }).click();
  await expect(form(page).getByRole("alert")).toBeVisible();

  await page.reload();
  await salvarExecucao(page, "Cancelada", { motivo: "Cliente desistiu (QA)" });
  await expect(page.getByText("Execução salva.")).toBeVisible();
  await expect(page.getByTestId("execucao-status")).toHaveText("Cancelada");
  await expect(page.getByText("Cliente desistiu (QA)").first()).toBeVisible();

  await page.getByLabel("Não fechou", { exact: true }).check();
  await page.getByLabel("Data da recusa *").fill("2026-11-11");
  await page.getByLabel("Motivo *").selectOption("Preço");
  await page.getByRole("button", { name: "Salvar resultado" }).click();
  await expect(page.getByText("Resultado salvo.")).toBeVisible();
  await expect(page.getByTestId("registrar-execucao")).toHaveCount(0);

  const admin = clienteAdmin();
  const { data: n } = await admin.from("negociacoes")
    .select("status_execucao, data_execucao_realizada, motivo_cancelamento_execucao").eq("id", id).single();
  expect(n).toEqual({ status_execucao: null, data_execucao_realizada: null, motivo_cancelamento_execucao: null });
  const { data: hist } = await admin.from("historico_negociacoes").select("*").eq("negociacao_id", id);
  const execucao = (hist ?? []).filter((h) => JSON.stringify(h).includes("status_execucao"));
  expect(execucao.length).toBeGreaterThanOrEqual(2); // pendente→cancelada e cancelada→nulo
  for (const h of execucao.filter((h) => JSON.stringify(h).includes("cancelada"))) {
    expect((h as { alterado_por: string | null }).alterado_por).toBe("11111111-1111-4111-8111-111111111111");
  }
});

test("AC-M1-5: pendente com execução prevista antes de hoje aparece como atrasada", async ({ page }) => {
  const ontem = hojeSP(-1);
  const nome = `QA Exec Atrasada ${Date.now() % 1e5}`;
  const cli = await criados.cliente("paula", nome);
  const vendaAntes = hojeSP(-10);
  const id = await criados.vendaFechada("paula", cli, vendaAntes, ontem);
  const amanha = hojeSP(1);
  const cli2 = await criados.cliente("paula", `${nome} futura`);
  const id2 = await criados.vendaFechada("paula", cli2, vendaAntes, amanha);

  await entrar(page, "paula");
  await page.goto(`/negociacoes/${id}`);
  await expect(page.getByTestId("execucao-status")).toHaveText("Atrasada");
  await page.goto(`/negociacoes/${id2}`);
  await expect(page.getByTestId("execucao-status")).toHaveText("Pendente");

  await page.goto(`/relatorio/execucao?mes=${mesDe(ontem)}`);
  await expect(page.getByTestId("relatorio-execucao-detalhe").getByRole("row", { name: new RegExp(`${nome}(?! futura)`) }).first())
    .toContainText(/Atrasada/);
  expect(Number(await page.getByTestId("ind-atrasadas").innerText())).toBeGreaterThanOrEqual(1);
});

test("AC-M1-6: Rafael não registra execução da Paula; gestora lê e não edita", async ({ page }) => {
  const id = NEGOCIACOES.marcosPacoteFechouOut;
  const { data: antes } = await clienteAdmin().from("negociacoes").select("*").eq("id", id).single();
  await entrar(page, "rafael");
  await page.goto(`/negociacoes/${id}`);
  await esperar404(page);

  // Formulário forjado: Rafael usa a própria venda e troca o id pela da Paula.
  await page.goto(`/negociacoes/${NEGOCIACOES.julianaPacoteFechouNov}`);
  const propria = NEGOCIACOES.julianaPacoteFechouNov;
  const { data: propriaAntes } = await clienteAdmin().from("negociacoes").select("status_execucao, data_execucao_realizada").eq("id", propria).single();
  try {
    await form(page).getByLabel("Realizada", { exact: true }).check();
    await form(page).getByLabel("Data realizada *").fill("2026-11-05");
    // Troca o id só depois dos re-renders do React, imediatamente antes do envio.
    await form(page).locator('input[name="id"]').evaluate((el, v) => el.setAttribute("value", ((el as HTMLInputElement).value = v)), id);
    expect(await form(page).locator('input[name="id"]').inputValue()).toBe(id);
    await form(page).getByRole("button", { name: "Salvar execução" }).click();
    await expect(form(page).getByRole("alert")).toHaveText("Negociação não encontrada.");
  } finally {
    await clienteAdmin().from("negociacoes").update(propriaAntes!).eq("id", propria);
  }

  await entrar(page, "veronica");
  await page.goto(`/negociacoes/${id}`);
  await expect(page.getByTestId("execucao-status")).toBeVisible();
  await expect(page.getByTestId("registrar-execucao")).toHaveCount(0);

  const { data: depois } = await clienteAdmin().from("negociacoes").select("*").eq("id", id).single();
  expect(depois).toEqual(antes);
});

test("AC-M1-7: CSV de execução tem as mesmas linhas da tela", async ({ page }) => {
  await entrar(page, "veronica");
  for (const mes of ["2026-10", "2026-11", mesDe(hojeSP())]) {
    await page.goto(`/relatorio/execucao?mes=${mes}`);
    await expect(page.getByTestId("relatorio-execucao")).toBeVisible();
    const tela = await page.getByTestId("relatorio-execucao-detalhe").locator("tbody tr").allInnerTexts();
    const semLinhas = tela.length === 1 && /Nenhum|Sem /i.test(tela[0]);
    const r = await page.request.get(`/relatorio/execucao.csv?mes=${mes}`);
    expect(r.status()).toBe(200);
    const csv = (await r.text()).replace(/^﻿/, "").split("\r\n").filter(Boolean).slice(1);
    expect(csv.length).toBe(semLinhas ? 0 : tela.length);
    csv.forEach((l, i) => expect(tela[i]).toContain(l.split(";")[0].replace(/^"|"$/g, "")));
  }
});
