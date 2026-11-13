/** QA-4: telas principais sem rolagem horizontal da página em 390 px e 1280 px. Capturas em test-results/. */
import { expect, test } from "@playwright/test";
import { CLIENTES, NEGOCIACOES } from "../fixtures";
import { entrar, type Quem } from "./apoio";

const TELAS: [Quem, string][] = [
  ["veronica", "/painel?mes=2026-11"],
  ["veronica", "/relatorio?mes=2026-10"],
  ["veronica", "/relatorio/execucao?mes=2026-11"],
  ["veronica", "/acoes?mes=2026-11"],
  ["veronica", "/conversas"],
  ["veronica", "/conversas/f1000000-0000-4000-8000-000000000002"],
  ["paula", "/clientes"],
  ["paula", `/clientes/${CLIENTES.marcos}`],
  ["paula", `/negociacoes/${NEGOCIACOES.marcosPacoteFechouOut}`],
  ["paula", `/clientes/${CLIENTES.marcos}/editar`],
  ["paula", `/clientes/${CLIENTES.marcos}/acoes/nova`],
  ["paula", `/clientes/${CLIENTES.marcos}/conversas/nova`],
];

for (const largura of [390, 1280]) {
  test(`QA-4: sem rolagem horizontal em ${largura}px`, async ({ page }) => {
    // DEFEITO D2-02 (P2): em 390 px /painel, /relatorio e /acoes rolam na horizontal (cabeçalho com navegação de mês).
    test.fail(largura === 390, "Conhecido: D2-02 — rolagem horizontal em 390 px.");
    await page.setViewportSize({ width: largura, height: 900 });
    const falhas: string[] = [];
    let atual: Quem | null = null;
    for (const [quem, url] of TELAS) {
      if (quem !== atual) { await entrar(page, quem); atual = quem; }
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
      if (sw > iw) falhas.push(`${url}: scrollWidth ${sw} > ${iw}`);
      const nome = url.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "");
      await page.screenshot({ path: `test-results/qa4/${largura}-${nome}.png`, fullPage: true });
    }
    expect(falhas).toEqual([]);
  });
}
