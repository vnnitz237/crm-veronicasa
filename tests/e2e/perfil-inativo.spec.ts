import { expect, test } from "@playwright/test";
import { SENHA, USUARIOS } from "../fixtures";
import { clienteAdmin } from "../supabase";

async function preencherLogin(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();
}

test.describe("perfil inativo", () => {
  test.afterEach(async () => {
    await clienteAdmin().from("perfis").update({ ativo: true }).in("id", [
      USUARIOS.paula.id,
      USUARIOS.rafael.id,
    ]);
  });

  test("rejeita o login, encerra a sessão e não entra em loop", async ({ page }) => {
    await clienteAdmin().from("perfis").update({ ativo: false }).eq("id", USUARIOS.paula.id);

    await preencherLogin(page, USUARIOS.paula.email);

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator("p[role=alert]")).toHaveText("Acesso desativado. Fale com a gestão.");

    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  });

  test("encerra uma sessão existente quando o perfil é desativado", async ({ page }) => {
    await preencherLogin(page, USUARIOS.paula.email);
    await expect(page.getByTestId("usuario-atual")).toContainText(USUARIOS.paula.nome);

    await clienteAdmin().from("perfis").update({ ativo: false }).eq("id", USUARIOS.paula.id);
    await page.goto("/clientes");

    await expect(page).toHaveURL(/\/login\?erro=acesso-desativado$/);
    await expect(page.locator("p[role=alert]")).toHaveText("Acesso desativado. Fale com a gestão.");
    await page.reload();
    await expect(page).toHaveURL(/\/login\?erro=acesso-desativado$/);
  });

  test("mantém o acesso de usuário ativo", async ({ page }) => {
    await preencherLogin(page, USUARIOS.rafael.email);

    await expect(page).toHaveURL("/");
    await expect(page.getByTestId("usuario-atual")).toContainText(USUARIOS.rafael.nome);
  });

  test("mantém 401 para CSV sem sessão", async ({ request }) => {
    const resposta = await request.get("/relatorio/vendas.csv");
    expect(resposta.status()).toBe(401);
    expect(await resposta.text()).toBe("Não autenticado.");
  });
});
