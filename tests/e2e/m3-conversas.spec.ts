/** Aceite M3 — conversas e análise da gestora (provisório H-C). */
import { expect, test, type Page } from "@playwright/test";
import { USUARIOS } from "../fixtures";
import { clienteAdmin, logarComo } from "../supabase";
import { Criados, entrar, esperar404 } from "./apoio";

const criados = new Criados();
test.afterAll(() => criados.limpar());

async function registrarConversa(page: Page, clienteId: string, conteudo: string, canal = "WhatsApp", quando = "2026-11-06T10:30") {
  await page.goto(`/clientes/${clienteId}`);
  await expect(page.locator(`a[href="/clientes/${clienteId}/conversas/nova"]`)).toBeVisible();
  await page.goto(`/clientes/${clienteId}/conversas/nova`);
  const f = page.getByTestId("nova-conversa");
  await f.getByLabel("Canal *").selectOption({ label: canal });
  await f.getByLabel("Data e hora *").fill(quando);
  await f.getByLabel("Conteúdo *").fill(conteudo);
  await f.getByRole("button", { name: "Registrar conversa" }).click();
  await expect(page).toHaveURL(/\/conversas\/[0-9a-f-]{36}$/);
  return new URL(page.url()).pathname.split("/").pop()!;
}

test("AC-M3-1/2: conversa colada aparece na ficha; correção cria versão nova e preserva a anterior", async ({ page }) => {
  const nome = `QA Conversa ${Date.now() % 1e5}`;
  const cli = await criados.cliente("paula", nome);
  const texto = "[06/11 10:30] Cliente: Oi, qual o horário?\n[06/11 10:31] Paula: Das 8h às 18h.";
  await entrar(page, "paula");
  const v1 = await registrarConversa(page, cli, texto);
  await expect(page.getByTestId("conversa-conteudo")).toHaveText(texto);
  await expect(page.getByRole("button", { name: /Editar|Excluir|Apagar/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Editar|Excluir|Apagar/i })).toHaveCount(0);

  await page.goto(`/clientes/${cli}`);
  await expect(page.getByTestId("conversas-cliente")).toContainText("Oi, qual o horário?");

  // Correção
  await page.goto(`/conversas/${v1}`);
  await page.getByTestId("corrigir-conversa").click();
  const f = page.getByTestId("corrigir-conversa-form");
  await f.getByLabel("Conteúdo *").fill(`${texto}\n[06/11 10:32] Cliente: Obrigado.`);
  await f.getByLabel("Motivo da correção *").fill("Faltou a última mensagem (QA)");
  await f.getByRole("button", { name: "Salvar correção" }).click();
  await expect(page).toHaveURL(/\/conversas\/[0-9a-f-]{36}$/);
  const v2 = new URL(page.url()).pathname.split("/").pop()!;
  expect(v2).not.toBe(v1);
  await expect(page.getByTestId("conversa-conteudo")).toContainText("Obrigado.");
  await expect(page.getByTestId("conversa-versoes")).toContainText("Faltou a última mensagem (QA)");

  // A anterior continua legível e não pode mais ser corrigida (nem pela rota).
  await page.goto(`/conversas/${v1}`);
  await expect(page.getByTestId("conversa-conteudo")).toHaveText(texto);
  await expect(page.getByTestId("aviso-versao-antiga")).toBeVisible();
  await expect(page.getByTestId("corrigir-conversa")).toHaveCount(0);
  await page.goto(`/conversas/${v1}/corrigir`);
  await esperar404(page);

  // Lista e ficha mostram só a versão atual.
  await page.goto(`/clientes/${cli}`);
  await expect(page.getByTestId("conversas-cliente").locator("tbody tr")).toHaveCount(1);

  // Pela API: nem UPDATE nem DELETE alteram; segunda correção da mesma versão é recusada.
  const paula = await logarComo("paula");
  await paula.from("conversas").update({ conteudo: "adulterado" }).eq("id", v1);
  await paula.from("conversas").delete().eq("id", v1);
  const dup = await paula.from("conversas").insert({
    cliente_id: cli, vendedor_id: USUARIOS.paula.id, canal: "whatsapp", ocorrida_em: "2026-11-06T13:30:00Z",
    conteudo: "segunda correção", substitui_conversa_id: v1, motivo_correcao: "QA",
  });
  expect(dup.error).not.toBeNull();
  const { data } = await clienteAdmin().from("conversas").select("conteudo").eq("id", v1).single();
  expect(data!.conteudo).toBe(texto); // regressão D2-05: gravado com \n, sem \r
  expect(data!.conteudo).not.toContain("\r");
});

test("AC-M3-3: Rafael não lê a conversa da Paula, nem por URL direta", async ({ page }) => {
  const cli = await criados.cliente("paula", `QA Conversa Priv ${Date.now() % 1e5}`);
  await entrar(page, "paula");
  const id = await registrarConversa(page, cli, "Conteúdo sigiloso QA");
  await entrar(page, "rafael");
  for (const url of [`/conversas/${id}`, `/conversas/f1000000-0000-4000-8000-000000000002`, `/conversas/${id}/corrigir`, `/clientes/${cli}/conversas/nova`]) {
    await page.goto(url);
    await esperar404(page);
    await expect(page.getByText("Conteúdo sigiloso QA")).toHaveCount(0);
  }
  await page.goto("/conversas");
  await expect(page.getByTestId("lista-conversas")).not.toContainText("Conteúdo sigiloso QA");
  await expect(page.getByTestId("lista-conversas")).not.toContainText("Marcos Teixeira");
});

test("AC-M3-4: gestora lista as dos dois, filtra por vendedor/canal/período, abre e registra análise", async ({ page }) => {
  const cli = await criados.cliente("paula", `QA Conversa Gest ${Date.now() % 1e5}`);
  await entrar(page, "paula");
  const id = await registrarConversa(page, cli, "Conversa para análise QA", "Instagram", "2026-11-07T09:00");

  await entrar(page, "veronica");
  await page.goto("/conversas");
  const lista = page.getByTestId("lista-conversas");
  await expect(lista).toContainText(USUARIOS.paula.nome);
  await expect(lista).toContainText(USUARIOS.rafael.nome);

  const filtros = page.getByTestId("filtros-conversas");
  await filtros.getByLabel("Vendedor(a)").selectOption({ label: USUARIOS.rafael.nome });
  await filtros.getByRole("button", { name: "Filtrar" }).click();
  await expect(lista).toContainText("Juliana Prado");
  await expect(lista).not.toContainText("Conversa para análise QA");

  await page.goto("/conversas");
  await filtros.getByLabel("Canal", { exact: true }).selectOption({ label: "Instagram" });
  await filtros.getByLabel("De", { exact: true }).fill("2026-11-07");
  await filtros.getByLabel("Até", { exact: true }).fill("2026-11-07");
  await filtros.getByRole("button", { name: "Filtrar" }).click();
  await expect(lista).toContainText("Conversa para análise QA");
  await expect(lista).not.toContainText("Juliana Prado");
  await expect(lista).not.toContainText("Marcos Teixeira");

  await page.goto("/conversas?de=2026-11-08&ate=2026-11-30");
  await expect(lista).not.toContainText("Conversa para análise QA");

  await page.goto(`/conversas/${id}`);
  await expect(page.getByTestId("corrigir-conversa")).toHaveCount(0);
  const f = page.getByTestId("nova-analise");
  await f.getByLabel("Registrar análise").fill("Análise da gestora QA");
  await f.getByRole("button", { name: "Registrar análise" }).click();
  await expect(page.getByTestId("analises")).toContainText("Análise da gestora QA");

  // Gestora não cria conversa (rota de nova conversa → 404).
  await page.goto(`/clientes/${cli}/conversas/nova`);
  await esperar404(page);
});

test("AC-M3-5: vendedor não vê nem cria análises (tela e API)", async ({ page }) => {
  const seedComAnalise = "f1000000-0000-4000-8000-000000000003"; // Rafael/Juliana, com análise no seed
  await entrar(page, "rafael");
  await page.goto(`/conversas/${seedComAnalise}`);
  await expect(page.getByTestId("conversa-conteudo")).toBeVisible();
  await expect(page.getByTestId("analises")).toHaveCount(0);
  await expect(page.getByTestId("nova-analise")).toHaveCount(0);
  await expect(page.getByText("Boa condução")).toHaveCount(0);

  const rafael = await logarComo("rafael");
  const { data } = await rafael.from("analises_conversa").select("*");
  expect(data ?? []).toEqual([]);
  const ins = await rafael.from("analises_conversa").insert({ conversa_id: seedComAnalise, comentario: "auto-análise" });
  expect(ins.error).not.toBeNull();
});

test("AC-M3-6: conteúdo acima de 20 mil caracteres é recusado", async ({ page }) => {
  const cli = await criados.cliente("paula", `QA Conversa Longa ${Date.now() % 1e5}`);
  await entrar(page, "paula");
  await page.goto(`/clientes/${cli}/conversas/nova`);
  const f = page.getByTestId("nova-conversa");
  await f.getByLabel("Canal *").selectOption({ label: "WhatsApp" });
  await f.getByLabel("Data e hora *").fill("2026-11-06T10:30");
  await f.getByLabel("Conteúdo *").evaluate((el) => { (el as HTMLTextAreaElement).maxLength = 100_000; (el as HTMLTextAreaElement).value = "x".repeat(20_001); });
  await f.getByRole("button", { name: "Registrar conversa" }).click();
  await expect(f.getByRole("alert")).toBeVisible();
  const { data } = await clienteAdmin().from("conversas").select("id").eq("cliente_id", cli);
  expect(data).toEqual([]);

  const paula = await logarComo("paula");
  const r = await paula.from("conversas").insert({
    cliente_id: cli, vendedor_id: USUARIOS.paula.id, canal: "whatsapp", ocorrida_em: "2026-11-06T13:30:00Z", conteudo: "y".repeat(20_001),
  });
  expect(r.error).not.toBeNull();
});
