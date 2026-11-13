/** Aceite M2 — ações comerciais (provisório H-A). */
import { expect, test, type Page } from "@playwright/test";
import { USUARIOS } from "../fixtures";
import { clienteAdmin, logarComo } from "../supabase";
import { Criados, br, entrar, esperar404, hojeSP, mesDe, numero } from "./apoio";

const criados = new Criados();
test.afterAll(() => criados.limpar());

async function novaAcao(page: Page, clienteId: string, o: { tipo: string; situacao: "Planejada" | "Realizada"; data: string; descricao: string; negociacao?: string }) {
  await page.goto(`/clientes/${clienteId}`);
  await page.getByRole("link", { name: "Nova ação" }).click();
  const f = page.getByTestId("nova-acao");
  await f.getByLabel("Tipo *").selectOption({ label: o.tipo });
  await f.getByLabel("Situação *").selectOption({ label: o.situacao });
  await f.getByLabel(o.situacao === "Planejada" ? "Data prevista *" : "Data realizada *").fill(o.data);
  if (o.negociacao) await f.getByLabel("Negociação").selectOption({ label: o.negociacao });
  await f.getByLabel("Descrição *").fill(o.descricao);
  await f.getByRole("button", { name: "Registrar ação" }).click();
  await expect(page).toHaveURL(/\/acoes\/[0-9a-f-]{36}$/);
  return new URL(page.url()).pathname.split("/").pop()!;
}

test("AC-M2-1: ação realizada (ligação, 05/11) ligada à negociação aparece nas ações de novembro", async ({ page }) => {
  const nome = `QA Ação Lig ${Date.now() % 1e5}`;
  const cli = await criados.cliente("paula", nome);
  const neg = await criados.vendaFechada("paula", cli, "2026-10-28", null);
  await entrar(page, "paula");
  const id = await novaAcao(page, cli, { tipo: "Ligação", situacao: "Realizada", data: "2026-11-05", descricao: "Ligação QA M2-1", negociacao: "Avaliação Completa · Unidade Centro" });
  await expect(page.getByTestId("acao-detalhe")).toContainText("05/11/2026");
  await expect(page.getByTestId("acao-detalhe")).toContainText("Avaliação Completa · Unidade Centro");
  const { data } = await clienteAdmin().from("acoes_venda").select("negociacao_id, situacao, tipo").eq("id", id).single();
  expect(data).toEqual({ negociacao_id: neg, situacao: "realizada", tipo: "ligacao" });

  await page.goto("/acoes?mes=2026-11");
  await expect(page.getByTestId("lista-acoes").getByRole("row", { name: new RegExp(nome) })).toContainText("Realizada");
  await page.goto("/acoes?mes=2026-10");
  await expect(page.getByTestId("lista-acoes")).not.toContainText(nome);
});

test("AC-M2-2: ação planejada para amanhã aparece em Próximas ações e na lista do mês", async ({ page }) => {
  const amanha = hojeSP(1);
  const nome = `QA Ação Plan ${Date.now() % 1e5}`;
  const cli = await criados.cliente("paula", nome);
  await entrar(page, "paula");
  await novaAcao(page, cli, { tipo: "Visita", situacao: "Planejada", data: amanha, descricao: "Visita QA amanhã" });
  await page.goto(`/clientes/${cli}`);
  await expect(page.getByTestId("proximas-acoes")).toContainText("Visita QA amanhã");
  await expect(page.getByTestId("proximas-acoes")).toContainText(br(amanha));
  await page.goto(`/acoes?mes=${mesDe(amanha)}`);
  await expect(page.getByTestId("lista-acoes").getByRole("row", { name: new RegExp(nome) })).toContainText("Planejada");
});

test("AC-M2-3: sem data, ou ligada a negociação de outro cliente, é recusada", async ({ page }) => {
  const cli = await criados.cliente("paula", `QA Ação Recusa ${Date.now() % 1e5}`);
  const outro = await criados.cliente("paula", `QA Ação Outro ${Date.now() % 1e5}`);
  const negOutro = await criados.vendaFechada("paula", outro, "2026-10-28", null);
  await entrar(page, "paula");
  await page.goto(`/clientes/${cli}/acoes/nova`);
  const f = page.getByTestId("nova-acao");
  await f.getByLabel("Tipo *").selectOption({ label: "Ligação" });
  await f.getByLabel("Situação *").selectOption({ label: "Realizada" });
  await f.getByLabel("Data realizada *").evaluate((el) => { (el as HTMLInputElement).required = false; (el as HTMLInputElement).value = ""; });
  await f.getByLabel("Descrição *").fill("Sem data QA");
  await f.getByRole("button", { name: "Registrar ação" }).click();
  await expect(f.getByRole("alert")).toBeVisible();

  await f.getByLabel("Situação *").selectOption({ label: "Planejada" });
  await f.getByLabel("Data prevista *").evaluate((el) => { (el as HTMLInputElement).required = false; (el as HTMLInputElement).value = ""; });
  await f.getByRole("button", { name: "Registrar ação" }).click();
  await expect(f.getByRole("alert")).toBeVisible();

  // Negociação de outro cliente, forjada no select.
  await page.reload();
  await f.getByLabel("Tipo *").selectOption({ label: "Ligação" });
  await f.getByLabel("Negociação").evaluate((el, v) => {
    const o = document.createElement("option"); o.value = v; o.text = "forjada"; el.appendChild(o); (el as HTMLSelectElement).value = v;
  }, negOutro);
  await f.getByLabel("Descrição *").fill("Negociação alheia QA");
  await f.getByRole("button", { name: "Registrar ação" }).click();
  await expect(f.getByRole("alert")).toBeVisible();

  const { data } = await clienteAdmin().from("acoes_venda").select("id").eq("cliente_id", cli);
  expect(data).toEqual([]);
});

test("AC-M2-4: cancelar muda a situação; não há exclusão", async ({ page }) => {
  const cli = await criados.cliente("paula", `QA Ação Cancela ${Date.now() % 1e5}`);
  await entrar(page, "paula");
  const id = await novaAcao(page, cli, { tipo: "Mensagem", situacao: "Planejada", data: hojeSP(3), descricao: "Cancelar QA" });
  await expect(page.getByRole("button", { name: /Excluir|Apagar/i })).toHaveCount(0);
  const f = page.getByTestId("form-atualizar-acao");
  await f.getByLabel("Situação *").selectOption({ label: "Cancelada" });
  await f.getByLabel("Motivo do cancelamento *").fill("Cliente pediu para remarcar (QA)");
  await f.getByRole("button", { name: "Salvar ação" }).click();
  await expect(page.getByTestId("acao-titulo")).toContainText("Cancelada");
  await expect(page.getByTestId("acao-detalhe")).toContainText("Cliente pediu para remarcar (QA)");
  await expect(page.getByRole("button", { name: /Excluir|Apagar/i })).toHaveCount(0);

  const paula = await logarComo("paula");
  await paula.from("acoes_venda").delete().eq("id", id);
  const { data } = await clienteAdmin().from("acoes_venda").select("situacao").eq("id", id).single();
  expect(data!.situacao).toBe("cancelada");
});

test("AC-M2-5: Rafael não vê ações da Paula (nem por URL); gestora vê as dos dois com totais", async ({ page }) => {
  const nome = `QA Ação Priv ${Date.now() % 1e5}`;
  const cli = await criados.cliente("paula", nome);
  await entrar(page, "paula");
  const id = await novaAcao(page, cli, { tipo: "Proposta", situacao: "Realizada", data: "2026-11-06", descricao: "Privada QA" });

  await entrar(page, "rafael");
  await page.goto(`/acoes/${id}`);
  await esperar404(page);
  await page.goto(`/acoes/e1000000-0000-4000-8000-000000000001`);
  await esperar404(page);
  await page.goto("/acoes?mes=2026-11");
  await expect(page.getByTestId("lista-acoes")).not.toContainText(nome);
  await expect(page.getByTestId("lista-acoes")).not.toContainText("Marcos Teixeira");
  await expect(page.getByTestId("acoes-por-responsavel")).toHaveCount(0);

  await entrar(page, "veronica");
  await page.goto(`/acoes/${id}`);
  await expect(page.getByTestId("acao-detalhe")).toContainText("Privada QA");
  await expect(page.getByTestId("form-atualizar-acao")).toHaveCount(0);
  await page.goto("/acoes?mes=2026-11");
  const lista = page.getByTestId("lista-acoes");
  await expect(lista).toContainText(nome);
  await expect(lista).toContainText(USUARIOS.paula.nome);
  await expect(lista).toContainText(USUARIOS.rafael.nome);
  const resp = page.getByTestId("acoes-por-responsavel");
  await expect(resp).toContainText(USUARIOS.paula.nome);
  await expect(resp).toContainText(USUARIOS.rafael.nome);
  await expect(page.getByTestId("acoes-por-tipo")).toContainText("Proposta");
});

test("AC-M2-6: relatório separa planejadas, realizadas e canceladas com os números da lista", async ({ page }) => {
  await entrar(page, "veronica");
  for (const mes of ["2026-10", "2026-11", mesDe(hojeSP())]) {
    await page.goto(`/acoes?mes=${mes}`);
    const linhas = page.getByTestId("lista-acoes").locator("tbody tr");
    const textos = await linhas.allInnerTexts();
    const conta = (s: string) => textos.filter((t) => t.includes(s)).length;
    expect(await numero(page, "ind-acoes-planejadas")).toBe(conta("Planejada"));
    expect(await numero(page, "ind-acoes-realizadas")).toBe(conta("Realizada"));
    expect(await numero(page, "ind-acoes-canceladas")).toBe(conta("Cancelada"));
    // Somas por tipo e por responsável batem com os indicadores.
    for (const tabela of ["acoes-por-tipo", "acoes-por-responsavel"]) {
      const rows = await page.getByTestId(tabela).locator("tbody tr").allInnerTexts();
      const tot = [0, 0, 0];
      for (const r of rows) {
        const n = r.split("\t").slice(1).map(Number);
        if (n.length === 3 && n.every(Number.isFinite)) n.forEach((v, i) => (tot[i] += v));
      }
      expect(tot).toEqual([conta("Planejada"), conta("Realizada"), conta("Cancelada")]);
    }
  }
});
