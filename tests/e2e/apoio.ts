/**
 * Apoio comum aos e2e de aceite (Agente D). Os dados de cada teste são criados
 * com o cliente administrativo e removidos no fim — nada depende da ordem dos arquivos.
 */
import { expect, type Page } from "@playwright/test";
import { SENHA, SERVICOS, UNIDADES, USUARIOS, telefoneFicticio } from "../fixtures";
import { clienteAdmin } from "../supabase";

export type Quem = keyof typeof USUARIOS;

export async function entrar(page: Page, quem: Quem) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(USUARIOS[quem].email);
  await page.getByLabel("Senha").fill(SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByTestId("usuario-atual")).toContainText(USUARIOS[quem].nome);
}

/** Data de hoje em São Paulo (AAAA-MM-DD), deslocada em `dias`. */
export function hojeSP(dias = 0) {
  const d = new Date(Date.now() + dias * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
}
export const mesDe = (iso: string) => iso.slice(0, 7);
export const br = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

export async function esperar404(page: Page) {
  await expect(page.getByRole("heading", { name: "Registro não encontrado" })).toBeVisible();
}

/** Registro dos dados criados por um arquivo de teste, para limpeza no afterAll. */
export class Criados {
  clientes: string[] = [];
  negociacoes: string[] = [];
  acoes: string[] = [];
  conversas: string[] = [];

  async cliente(vendedor: Quem, nome: string) {
    const { data, error } = await clienteAdmin().from("clientes")
      .insert({ nome, telefone: telefoneFicticio(), vendedor_id: USUARIOS[vendedor].id })
      .select("id").single();
    if (error) throw error;
    this.clientes.push(data.id);
    return data.id;
  }

  /** Negociação fechada (status_execucao vira pendente pelo gatilho). */
  async vendaFechada(vendedor: Quem, clienteId: string, dataVenda: string, prevista: string | null, valor = 100) {
    const { data, error } = await clienteAdmin().from("negociacoes")
      .insert({
        cliente_id: clienteId, vendedor_id: USUARIOS[vendedor].id, servico_id: SERVICOS.avaliacao,
        unidade_id: UNIDADES.centro, valor, status: "fechou", data_venda: dataVenda, data_execucao_prevista: prevista,
      })
      .select("id").single();
    if (error) throw error;
    this.negociacoes.push(data.id);
    return data.id;
  }

  /** Remove tudo o que foi criado (inclusive registros criados pela tela nos clientes do teste). */
  async limpar() {
    const admin = clienteAdmin();
    if (this.clientes.length) {
      const { data: conv } = await admin.from("conversas").select("id").in("cliente_id", this.clientes);
      this.conversas.push(...(conv ?? []).map((c) => c.id));
      const { data: ac } = await admin.from("acoes_venda").select("id").in("cliente_id", this.clientes);
      this.acoes.push(...(ac ?? []).map((a) => a.id));
      const { data: ng } = await admin.from("negociacoes").select("id").in("cliente_id", this.clientes);
      this.negociacoes.push(...(ng ?? []).map((n) => n.id));
    }
    if (this.conversas.length) {
      await admin.from("analises_conversa").delete().in("conversa_id", this.conversas);
      // Correções apontam para a anterior (restrict): apaga das mais novas para as mais antigas.
      for (let i = 0; i < 10; i++) {
        const { data: resto } = await admin.from("conversas").select("id, substitui_conversa_id").in("id", this.conversas);
        if (!resto?.length) break;
        const referenciadas = new Set(resto.map((c) => c.substitui_conversa_id).filter(Boolean));
        const folhas = resto.filter((c) => !referenciadas.has(c.id)).map((c) => c.id);
        await admin.from("conversas").delete().in("id", folhas);
      }
    }
    if (this.acoes.length) await admin.from("acoes_venda").delete().in("id", this.acoes);
    if (this.negociacoes.length) await admin.from("negociacoes").delete().in("id", this.negociacoes);
    if (this.clientes.length) await admin.from("clientes").delete().in("id", this.clientes);
  }
}

/** Lê o número (primeiro inteiro) de um elemento. */
export async function numero(page: Page, testId: string) {
  const t = (await page.getByTestId(testId).first().innerText()).replace(/\./g, "");
  return Number(t.match(/\d+/)?.[0] ?? NaN);
}
