/**
 * QA independente (Agente D): auditoria de RLS/funções (QA-1, QA-2), perfil inativo (QA-3)
 * e lacunas de aceite de M1–M3 no nível do banco que `a-contrato.test.ts` não cobre.
 * Pré-condição: banco recém-resetado (`npm run db:reset`).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { CLIENTES, NEGOCIACOES, USUARIOS } from "../fixtures";
import { clienteAdmin, clienteAnonimo, logarComo } from "../supabase";

type Db = SupabaseClient<Database>;
const P = USUARIOS.paula.id;
const R = USUARIOS.rafael.id;
const CONVERSA_MARCOS_ATUAL = "f1000000-0000-4000-8000-000000000002";
const ACAO_PAULA = "e1000000-0000-4000-8000-000000000001";

let paula: Db;
let rafael: Db;
let veronica: Db;

async function sql<T = Record<string, unknown>>(texto: string, params: unknown[] = []): Promise<T[]> {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error("SUPABASE_DB_URL ausente. Rode `npm run env:local`.");
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  try {
    return (await c.query(texto, params)).rows as T[];
  } finally {
    await c.end();
  }
}

beforeAll(async () => {
  [paula, rafael, veronica] = await Promise.all([logarComo("paula"), logarComo("rafael"), logarComo("veronica")]);
});

describe("QA-1 — RLS em todas as tabelas de public", () => {
  it("toda tabela de public tem RLS ativa", async () => {
    const semRls = await sql<{ relname: string }>(
      `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind in ('r','p') and not c.relrowsecurity order by 1`);
    expect(semRls.map((r) => r.relname)).toEqual([]);
  });

  it("nenhuma política para anon/public e nenhuma política de DELETE", async () => {
    const pol = await sql<{ tablename: string; policyname: string; cmd: string; roles: string[] | string }>(
      `select tablename, policyname, cmd, roles from pg_policies where schemaname = 'public'`);
    expect(pol.length).toBeGreaterThan(0);
    const papeis = (r: string[] | string) => (Array.isArray(r) ? r : String(r).replace(/[{}]/g, "").split(","));
    expect(pol.filter((p) => papeis(p.roles).some((x) => x === "anon" || x === "public")).map((p) => p.policyname)).toEqual([]);
    expect(pol.filter((p) => p.cmd === "DELETE" || p.cmd === "ALL").map((p) => p.policyname)).toEqual([]);
  });

  it("conversas e analises_conversa não têm política de UPDATE (imutáveis)", async () => {
    const pol = await sql(`select policyname from pg_policies where schemaname='public'
      and tablename in ('conversas','analises_conversa','historico_negociacoes','historico_acoes') and cmd in ('UPDATE','INSERT','ALL')
      and not (tablename in ('conversas','analises_conversa') and cmd = 'INSERT')`);
    expect(pol).toEqual([]);
  });

  it("anon não lê nada em nenhuma tabela/visão de public", async () => {
    const anon = clienteAnonimo();
    const rels = await sql<{ relname: string }>(
      `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind in ('r','v','p')`);
    for (const { relname } of rels) {
      const { data } = await anon.from(relname as "clientes").select("*").limit(1);
      expect(data ?? [], relname).toEqual([]);
    }
  });
});

describe("QA-2 — funções security definer", () => {
  it("todas com search_path fixo", async () => {
    const f = await sql<{ proname: string; proconfig: string[] | null }>(
      `select p.proname, p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.prosecdef`);
    expect(f.length).toBeGreaterThan(0);
    expect(f.filter((x) => !(x.proconfig ?? []).some((c) => c.startsWith("search_path="))).map((x) => x.proname)).toEqual([]);
  });

  it("nenhuma função security definer executável por anon (inclusive as de gatilho, após D2-04)", async () => {
    const f = await sql<{ proname: string }>(
      `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.prosecdef and has_function_privilege('anon', p.oid, 'execute')`);
    expect(f.map((x) => x.proname)).toEqual([]);
  });

  it("anon só executa normalizar_telefone (pura, imutável, security invoker, sem acesso a tabelas)", async () => {
    const f = await sql<{ proname: string; prosecdef: boolean; provolatile: string }>(
      `select p.proname, p.prosecdef, p.provolatile from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute') order by 1`);
    expect(f).toEqual([{ proname: "normalizar_telefone", prosecdef: false, provolatile: "i" }]);
  });

  it("RPCs de relatório não devolvem dados ao anon", async () => {
    const anon = clienteAnonimo();
    for (const fn of ["negociacoes_resultado_mes", "negociacoes_execucao_mes", "acoes_mes"] as const) {
      const { data } = await anon.rpc(fn, { p_ano: 2026, p_mes: 11 });
      expect(data ?? [], fn).toEqual([]);
    }
  });
});

describe("QA-3 — perfil inativo não lê nem escreve", () => {
  it("Paula inativa: leitura vazia e escrita recusada em todas as tabelas de negócio", async () => {
    const admin = clienteAdmin();
    const { error: e1 } = await admin.from("perfis").update({ ativo: false }).eq("id", P);
    expect(e1).toBeNull();
    try {
      const inativa = await logarComo("paula"); // a sessão continua emitida pelo Auth (D-01)
      const tabelas = ["clientes", "negociacoes", "historico_negociacoes", "acoes_venda", "historico_acoes",
        "conversas", "analises_conversa", "vw_negociacoes", "vw_acoes", "vw_conversas", "conflitos_telefone"] as const;
      for (const t of tabelas) {
        const { data } = await inativa.from(t as "clientes").select("*").limit(5);
        expect(data ?? [], t).toEqual([]);
      }
      for (const fn of ["negociacoes_resultado_mes", "negociacoes_execucao_mes", "acoes_mes"] as const) {
        const { data } = await inativa.rpc(fn, { p_ano: 2026, p_mes: 10 });
        expect(data ?? [], fn).toEqual([]);
      }

      const antes = await admin.from("clientes").select("*").eq("id", CLIENTES.marcos).single();
      await inativa.from("clientes").update({ nome: "Inativa alterou" }).eq("id", CLIENTES.marcos);
      await inativa.from("negociacoes").update({ valor: 1 }).eq("id", NEGOCIACOES.marcosPacoteFechouOut);
      await inativa.from("acoes_venda").update({ resultado: "inativa" }).eq("id", ACAO_PAULA);
      const depois = await admin.from("clientes").select("*").eq("id", CLIENTES.marcos).single();
      expect(depois.data).toEqual(antes.data);
      expect((await admin.from("negociacoes").select("valor").eq("id", NEGOCIACOES.marcosPacoteFechouOut).single()).data!.valor).toBe(1200);
      expect((await admin.from("acoes_venda").select("resultado").eq("id", ACAO_PAULA).single()).data!.resultado).not.toBe("inativa");

      const novoCli = await inativa.from("clientes").insert({ nome: "Inativa", telefone: "11980000999", vendedor_id: P }).select("id");
      expect(novoCli.error).not.toBeNull();
      const novaAcao = await inativa.from("acoes_venda").insert({
        cliente_id: CLIENTES.marcos, vendedor_id: P, tipo: "ligacao", data_prevista: "2026-11-30", descricao: "inativa",
      }).select("id");
      expect(novaAcao.error).not.toBeNull();
      const novaConv = await inativa.from("conversas").insert({
        cliente_id: CLIENTES.marcos, vendedor_id: P, canal: "outro", ocorrida_em: "2026-11-12T10:00:00Z", conteudo: "inativa",
      }).select("id");
      expect(novaConv.error).not.toBeNull();
    } finally {
      await admin.from("perfis").update({ ativo: true }).eq("id", P);
    }
    // Restaurado: volta a ler.
    const ativa = await logarComo("paula");
    expect((await ativa.from("clientes").select("id").eq("id", CLIENTES.marcos)).data).toHaveLength(1);
  });

  it("gestora inativa não lê conversas nem análises", async () => {
    const admin = clienteAdmin();
    await admin.from("perfis").update({ ativo: false }).eq("id", USUARIOS.veronica.id);
    try {
      const v = await logarComo("veronica");
      for (const t of ["conversas", "analises_conversa", "clientes", "negociacoes"] as const) {
        expect((await v.from(t).select("id").limit(1)).data ?? [], t).toEqual([]);
      }
      expect((await v.from("analises_conversa").insert({ conversa_id: CONVERSA_MARCOS_ATUAL, comentario: "inativa" })).error).not.toBeNull();
    } finally {
      await admin.from("perfis").update({ ativo: true }).eq("id", USUARIOS.veronica.id);
    }
  });
});

describe("Lacunas de aceite M1–M3 no banco (não cobertas por a-contrato)", () => {
  it("M1/M2: históricos não podem ser forjados nem lidos por outro vendedor", async () => {
    const hn = await paula.from("historico_negociacoes").insert({ negociacao_id: NEGOCIACOES.marcosPacoteFechouOut, campo: "status" } as never);
    expect(hn.error).not.toBeNull();
    const ha = await paula.from("historico_acoes").insert({ acao_id: ACAO_PAULA } as never);
    expect(ha.error).not.toBeNull();

    expect((await rafael.from("historico_negociacoes").select("id").eq("negociacao_id", NEGOCIACOES.marcosPacoteFechouOut)).data).toEqual([]);
    expect((await rafael.from("historico_acoes").select("id").eq("acao_id", ACAO_PAULA)).data).toEqual([]);
    // A gestora lê o histórico das ações dos dois.
    const { data: hg } = await veronica.from("historico_acoes").select("acao_id");
    expect((hg ?? []).length).toBeGreaterThan(0);
  });

  it("M1: Rafael não registra execução da Paula pela API; gestora também não", async () => {
    for (const db of [rafael, veronica]) {
      const r = await db.from("negociacoes")
        .update({ status_execucao: "realizada", data_execucao_realizada: "2026-11-05" })
        .eq("id", NEGOCIACOES.marcosPacoteFechouOut).select("id");
      expect(r.data ?? []).toEqual([]);
    }
    const { data } = await clienteAdmin().from("negociacoes").select("status_execucao").eq("id", NEGOCIACOES.marcosPacoteFechouOut).single();
    expect(data!.status_execucao).toBe("pendente");
  });

  it("M2: ação não pode ser excluída nem pelo dono", async () => {
    await paula.from("acoes_venda").delete().eq("id", ACAO_PAULA);
    expect((await clienteAdmin().from("acoes_venda").select("id").eq("id", ACAO_PAULA)).data).toHaveLength(1);
  });

  it("M3: registrada_por não pode ser forjado; Rafael não corrige conversa da Paula", async () => {
    const forjada = await paula.from("conversas").insert({
      cliente_id: CLIENTES.marcos, vendedor_id: P, registrada_por: R, canal: "outro", ocorrida_em: "2026-11-12T10:00:00Z", conteudo: "forjada",
    }).select("id");
    expect(forjada.error).not.toBeNull();

    const corr = await rafael.from("conversas").insert({
      cliente_id: CLIENTES.marcos, vendedor_id: P, canal: "whatsapp", ocorrida_em: "2026-11-12T10:00:00Z",
      conteudo: "invasão", substitui_conversa_id: CONVERSA_MARCOS_ATUAL, motivo_correcao: "x",
    }).select("id");
    expect(corr.error).not.toBeNull();
    // A versão atual do Marcos continua sem correção.
    const { data } = await clienteAdmin().from("conversas").select("id").eq("substitui_conversa_id", CONVERSA_MARCOS_ATUAL);
    expect(data).toEqual([]);
  });

  it("M3: análise não é editável nem excluível, nem pela gestora", async () => {
    const id = "f2000000-0000-4000-8000-000000000001";
    await veronica.from("analises_conversa").update({ comentario: "editada" }).eq("id", id);
    await veronica.from("analises_conversa").delete().eq("id", id);
    const { data } = await clienteAdmin().from("analises_conversa").select("comentario").eq("id", id).single();
    expect(data!.comentario).toBe("Boa condução: confirmou valor e data antes do aceite.");
  });

  it("M3: vendedor não vê análises por meio de vw_conversas nem por embed", async () => {
    const r = await rafael.from("conversas").select("id, analises_conversa(comentario)").eq("id", "f1000000-0000-4000-8000-000000000003");
    expect(r.data?.[0]?.analises_conversa ?? []).toEqual([]);
  });
});

afterAll(async () => {
  // Garantia extra: ninguém fica inativo depois da suíte.
  await clienteAdmin().from("perfis").update({ ativo: true }).in("id", [P, R, USUARIOS.veronica.id]);
});
