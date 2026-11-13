/**
 * Contrato de dados M1 (execuções), M2 (ações) e M3 (conversas) — Agente A.
 * Pré-condição: banco recém-resetado (`npm run db:reset`).
 * Restrições são testadas como superusuário em transações SEMPRE desfeitas;
 * RLS é testada pelos clientes logados, com limpeza no fim.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { CLIENTES, NEGOCIACOES, USUARIOS } from "../fixtures";
import { clienteAdmin, clienteAnonimo, logarComo } from "../supabase";

type Db = SupabaseClient<Database>;
let paula: Db;
let rafael: Db;
let veronica: Db;
const anon = clienteAnonimo();
// leitura genérica (laços sobre tabelas e visões) sem a união de tipos do cliente tipado
const anonGenerico = anon as unknown as SupabaseClient;
const criadas = { acoes: [] as string[], conversas: [] as string[], analises: [] as string[] };

const ACOES = {
  paulaLigacaoRealizadaOut: "e1000000-0000-4000-8000-000000000001",
  rafaelPropostaRealizadaNov: "e1000000-0000-4000-8000-000000000004",
};
const CONVERSAS = {
  marcosOriginal: "f1000000-0000-4000-8000-000000000001",
  marcosCorrecao: "f1000000-0000-4000-8000-000000000002",
  juliana: "f1000000-0000-4000-8000-000000000003",
};

beforeAll(async () => {
  [paula, rafael, veronica] = await Promise.all([logarComo("paula"), logarComo("rafael"), logarComo("veronica")]);
});

afterAll(async () => {
  const admin = clienteAdmin();
  if (criadas.analises.length) await admin.from("analises_conversa").delete().in("id", criadas.analises);
  // correções antes das originais (FK substitui_conversa_id)
  for (const id of [...criadas.conversas].reverse()) await admin.from("conversas").delete().eq("id", id);
  if (criadas.acoes.length) await admin.from("acoes_venda").delete().in("id", criadas.acoes);
});

async function emTransacaoDesfeita(fn: (c: pg.Client) => Promise<void>) {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error("SUPABASE_DB_URL ausente. Rode `npm run env:local`.");
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  try {
    await c.query("begin");
    await fn(c);
  } finally {
    await c.query("rollback").catch(() => {});
    await c.end();
  }
}

async function erroSql(c: pg.Client, sql: string, params: unknown[] = []) {
  await c.query("savepoint s");
  try {
    await c.query(sql, params);
    await c.query("release savepoint s");
    return null;
  } catch (e) {
    await c.query("rollback to savepoint s");
    return e as { code: string; message: string };
  }
}

const P = USUARIOS.paula.id;
const R = USUARIOS.rafael.id;

// ===========================================================================
describe("M1 — execuções", () => {
  it("seed: d…004 realizada em 20/10; d…001 e d…005 pendentes", async () => {
    const { data } = await veronica.from("vw_negociacoes")
      .select("id, status, status_execucao, data_execucao_realizada, data_execucao_prevista, motivo_cancelamento_execucao")
      .order("id");
    const por = Object.fromEntries((data ?? []).map((n) => [n.id, n]));
    expect(por[NEGOCIACOES.julianaConsultoriaFechouOut]).toMatchObject({ status_execucao: "realizada", data_execucao_realizada: "2026-10-20" });
    expect(por[NEGOCIACOES.marcosPacoteFechouOut]).toMatchObject({ status_execucao: "pendente", data_execucao_prevista: "2026-11-04" });
    expect(por[NEGOCIACOES.julianaPacoteFechouNov]).toMatchObject({ status_execucao: "pendente", data_execucao_prevista: "2026-11-10" });
    for (const id of [NEGOCIACOES.beatrizEmNegociacao, NEGOCIACOES.marcosAvaliacaoPerdidaOut, NEGOCIACOES.carlosEmNegociacao]) {
      expect(por[id].status_execucao).toBeNull();
    }
  });

  it("restrições e gatilho de execução", async () => {
    await emTransacaoDesfeita(async (c) => {
      const d1 = NEGOCIACOES.marcosPacoteFechouOut;
      // realizada sem data
      expect((await erroSql(c, "update public.negociacoes set status_execucao='realizada' where id=$1", [d1]))?.code).toBe("23514");
      // data realizada sem status realizada
      expect((await erroSql(c, "update public.negociacoes set data_execucao_realizada='2026-11-05' where id=$1", [d1]))?.code).toBe("23514");
      // realizada antes da venda (28/10)
      expect((await erroSql(c, "update public.negociacoes set status_execucao='realizada', data_execucao_realizada='2026-10-27' where id=$1", [d1]))?.code).toBe("23514");
      // cancelada sem motivo / com motivo em branco
      expect((await erroSql(c, "update public.negociacoes set status_execucao='cancelada' where id=$1", [d1]))?.code).toBe("23514");
      expect((await erroSql(c, "update public.negociacoes set status_execucao='cancelada', motivo_cancelamento_execucao='  ' where id=$1", [d1]))?.code).toBe("23514");
      // motivo em pendente
      expect((await erroSql(c, "update public.negociacoes set motivo_cancelamento_execucao='x' where id=$1", [d1]))?.code).toBe("23514");
      // nulo em negociação fechada volta a pendente (gatilho)
      expect(await erroSql(c, "update public.negociacoes set status_execucao=null where id=$1", [d1])).toBeNull();
      expect((await c.query("select status_execucao from public.negociacoes where id=$1", [d1])).rows[0].status_execucao).toBe("pendente");
      // válidas
      expect(await erroSql(c, "update public.negociacoes set status_execucao='realizada', data_execucao_realizada='2026-10-28' where id=$1", [d1])).toBeNull();
      expect(await erroSql(c, "update public.negociacoes set status_execucao='cancelada', data_execucao_realizada=null, motivo_cancelamento_execucao='Desistiu' where id=$1", [d1])).toBeNull();

      // sair de "fechou" limpa os três campos
      await c.query("update public.negociacoes set status='em_negociacao', data_venda=null where id=$1", [d1]);
      const r = await c.query("select status_execucao, data_execucao_realizada, motivo_cancelamento_execucao from public.negociacoes where id=$1", [d1]);
      expect(r.rows[0]).toEqual({ status_execucao: null, data_execucao_realizada: null, motivo_cancelamento_execucao: null });

      // virar "fechou" cria pendente; não fechada não aceita status de execução
      const d3 = NEGOCIACOES.beatrizEmNegociacao;
      await c.query("update public.negociacoes set status='fechou', data_venda='2026-11-01' where id=$1", [d3]);
      expect((await c.query("select status_execucao from public.negociacoes where id=$1", [d3])).rows[0].status_execucao).toBe("pendente");
      const d6 = NEGOCIACOES.carlosEmNegociacao;
      await c.query("update public.negociacoes set status_execucao='pendente' where id=$1", [d6]);
      expect((await c.query("select status_execucao from public.negociacoes where id=$1", [d6])).rows[0].status_execucao).toBeNull();
    });
  });

  it("dono registra execução com histórico; outro vendedor e gestora não alteram", async () => {
    const id = NEGOCIACOES.julianaPacoteFechouNov; // Rafael
    const outro = await paula.from("negociacoes").update({ status_execucao: "realizada", data_execucao_realizada: "2026-11-10" }).eq("id", id).select("id");
    expect(outro.data ?? []).toHaveLength(0);
    const gestora = await veronica.from("negociacoes").update({ status_execucao: "realizada", data_execucao_realizada: "2026-11-10" }).eq("id", id).select("id");
    expect(gestora.data ?? []).toHaveLength(0);

    const ok = await rafael.from("negociacoes")
      .update({ status_execucao: "realizada", data_execucao_realizada: "2026-11-10" }).eq("id", id).select("status_execucao").single();
    expect(ok.error).toBeNull();
    expect(ok.data?.status_execucao).toBe("realizada");
    const { data: hist } = await rafael.from("historico_negociacoes")
      .select("campo, valor_anterior, valor_novo, alterado_por").eq("negociacao_id", id)
      .in("campo", ["status_execucao", "data_execucao_realizada"]);
    expect(hist).toEqual(expect.arrayContaining([
      { campo: "status_execucao", valor_anterior: "pendente", valor_novo: "realizada", alterado_por: R },
      { campo: "data_execucao_realizada", valor_anterior: null, valor_novo: "2026-11-10", alterado_por: R },
    ]));
    // volta ao estado do seed
    const volta = await rafael.from("negociacoes").update({ status_execucao: "pendente", data_execucao_realizada: null }).eq("id", id);
    expect(volta.error).toBeNull();
  });

  it("negociacoes_execucao_mes respeita mês e RLS", async () => {
    const out = await veronica.rpc("negociacoes_execucao_mes", { p_ano: 2026, p_mes: 10 });
    expect(out.data?.map((n) => n.id)).toEqual([NEGOCIACOES.julianaConsultoriaFechouOut]);
    const nov = await veronica.rpc("negociacoes_execucao_mes", { p_ano: 2026, p_mes: 11 });
    expect(nov.data?.map((n) => n.id).sort()).toEqual([NEGOCIACOES.marcosPacoteFechouOut, NEGOCIACOES.julianaPacoteFechouNov].sort());
    const paulaNov = await paula.rpc("negociacoes_execucao_mes", { p_ano: 2026, p_mes: 11 });
    expect(paulaNov.data?.map((n) => n.id)).toEqual([NEGOCIACOES.marcosPacoteFechouOut]);
    const a = await anon.rpc("negociacoes_execucao_mes", { p_ano: 2026, p_mes: 11 });
    expect(a.error).not.toBeNull();
  });

  it("cancelada entra no mês pela data prevista", async () => {
    await emTransacaoDesfeita(async (c) => {
      await c.query("update public.negociacoes set status_execucao='cancelada', motivo_cancelamento_execucao='x' where id=$1", [NEGOCIACOES.marcosPacoteFechouOut]);
      const r = await c.query("select id, status_execucao from public.negociacoes_execucao_mes(2026, 11) order by id");
      expect(r.rows.map((x) => x.status_execucao)).toEqual(["cancelada", "pendente"]);
    });
  });
});

// ===========================================================================
describe("M2 — ações comerciais", () => {
  it("RLS de leitura: cada vendedor as próprias, gestora todas, anônimo nada", async () => {
    const p = await paula.from("acoes_venda").select("vendedor_id");
    expect(p.data?.length).toBe(3);
    expect(p.data?.every((a) => a.vendedor_id === P)).toBe(true);
    const r = await rafael.from("vw_acoes").select("vendedor_id, vendedor_nome");
    expect(r.data?.length).toBe(3);
    expect(r.data?.every((a) => a.vendedor_id === R)).toBe(true);
    expect((await veronica.from("acoes_venda").select("id")).data?.length).toBe(6);
    expect((await veronica.from("historico_acoes").select("id")).data?.length).toBe(6);
    expect((await paula.from("historico_acoes").select("acao_id")).data?.length).toBe(3);
    for (const t of ["acoes_venda", "vw_acoes", "historico_acoes"] as const) {
      const a = await anonGenerico.from(t).select("*");
      expect(a.data ?? [], t).toHaveLength(0);
    }
  });

  it("vw_acoes traz nomes e rótulo da negociação", async () => {
    const { data } = await veronica.from("vw_acoes").select("*").eq("id", ACOES.paulaLigacaoRealizadaOut).single();
    expect(data).toMatchObject({ cliente_nome: "Marcos Teixeira", vendedor_nome: "Paula Lima", negociacao_rotulo: "Pacote Mensal · Unidade Centro" });
  });

  it("vendedor cria e atualiza ação própria, com histórico", async () => {
    const ins = await paula.from("acoes_venda").insert({
      cliente_id: CLIENTES.beatriz, negociacao_id: NEGOCIACOES.beatrizEmNegociacao, tipo: "ligacao",
      data_prevista: "2026-12-01", descricao: "Teste A1",
    }).select("id, vendedor_id, situacao").single();
    expect(ins.error).toBeNull();
    criadas.acoes.push(ins.data!.id);
    expect(ins.data).toMatchObject({ vendedor_id: P, situacao: "planejada" });

    const up = await paula.from("acoes_venda")
      .update({ situacao: "realizada", data_realizada: "2026-12-02", resultado: "ok" }).eq("id", ins.data!.id).select("atualizado_em").single();
    expect(up.error).toBeNull();
    const { data: hist } = await paula.from("historico_acoes").select("campo, valor_anterior, valor_novo, alterado_por").eq("acao_id", ins.data!.id);
    expect(hist).toEqual(expect.arrayContaining([
      { campo: "criada", valor_anterior: null, valor_novo: "planejada", alterado_por: P },
      { campo: "situacao", valor_anterior: "planejada", valor_novo: "realizada", alterado_por: P },
      { campo: "data_realizada", valor_anterior: null, valor_novo: "2026-12-02", alterado_por: P },
    ]));
    expect(hist).toHaveLength(3);
  });

  it("bloqueios de escrita: cliente alheio, gestora, outro vendedor, anônimo, exclusão", async () => {
    const base = { tipo: "ligacao" as const, data_prevista: "2026-12-01", descricao: "x" };
    expect((await paula.from("acoes_venda").insert({ ...base, cliente_id: CLIENTES.juliana })).error).not.toBeNull();
    expect((await paula.from("acoes_venda").insert({ ...base, cliente_id: CLIENTES.juliana, vendedor_id: R })).error?.code).toBe("42501");
    expect((await veronica.from("acoes_venda").insert({ ...base, cliente_id: CLIENTES.marcos, vendedor_id: P })).error).not.toBeNull();
    expect((await anon.from("acoes_venda").insert({ ...base, cliente_id: CLIENTES.marcos, vendedor_id: P })).error).not.toBeNull();
    const up = await rafael.from("acoes_venda").update({ resultado: "hack" }).eq("id", ACOES.paulaLigacaoRealizadaOut).select("id");
    expect(up.data ?? []).toHaveLength(0);
    const upG = await veronica.from("acoes_venda").update({ resultado: "hack" }).eq("id", ACOES.paulaLigacaoRealizadaOut).select("id");
    expect(upG.data ?? []).toHaveLength(0);
    await paula.from("acoes_venda").delete().eq("id", ACOES.paulaLigacaoRealizadaOut);
    expect((await veronica.from("acoes_venda").select("id").eq("id", ACOES.paulaLigacaoRealizadaOut)).data).toHaveLength(1);
  });

  it("restrições de ações", async () => {
    await emTransacaoDesfeita(async (c) => {
      const ins = (extra: string, vals: unknown[]) => erroSql(c,
        `insert into public.acoes_venda (cliente_id, vendedor_id, tipo, ${extra}) values ($1, $2, 'ligacao', ${vals.map((_, i) => `$${i + 3}`).join(", ")})`,
        [CLIENTES.marcos, P, ...vals]);
      // planejada sem data prevista
      expect((await ins("descricao", ["x"]))?.code).toBe("23514");
      // realizada sem data realizada
      expect((await ins("situacao, descricao", ["realizada", "x"]))?.code).toBe("23514");
      // cancelada sem motivo
      expect((await ins("situacao, data_prevista, descricao", ["cancelada", "2026-11-01", "x"]))?.code).toBe("23514");
      // descrição vazia / longa demais
      expect((await ins("data_prevista, descricao", ["2026-11-01", "   "]))?.code).toBe("23514");
      expect((await ins("data_prevista, descricao", ["2026-11-01", "a".repeat(2001)]))?.code).toBe("23514");
      // negociação de outro cliente
      expect((await ins("negociacao_id, data_prevista, descricao", [NEGOCIACOES.beatrizEmNegociacao, "2026-11-01", "x"]))?.code).toBe("23514");
      // responsável diferente do dono do cliente
      expect((await erroSql(c, "insert into public.acoes_venda (cliente_id, vendedor_id, tipo, data_prevista, descricao) values ($1, $2, 'ligacao', '2026-11-01', 'x')", [CLIENTES.marcos, R]))?.code).toBe("42501");
      // válida
      expect(await ins("data_prevista, descricao", ["2026-11-01", "a".repeat(2000)])).toBeNull();
      // imutáveis
      const id = ACOES.paulaLigacaoRealizadaOut;
      expect((await erroSql(c, "update public.acoes_venda set cliente_id=$2 where id=$1", [id, CLIENTES.beatriz]))?.code).toBe("42501");
      expect((await erroSql(c, "update public.acoes_venda set negociacao_id=null where id=$1", [id]))?.code).toBe("42501");
      expect((await erroSql(c, "update public.acoes_venda set vendedor_id=$2 where id=$1", [id, R]))?.code).toBe("42501");
    });
  });

  it("acoes_mes: realizadas pela data realizada; planejadas e canceladas pela prevista", async () => {
    const nov = await veronica.rpc("acoes_mes", { p_ano: 2026, p_mes: 11 });
    const cont = (s: string) => nov.data?.filter((a) => a.situacao === s).length;
    expect([cont("realizada"), cont("planejada"), cont("cancelada")]).toEqual([1, 3, 1]);
    const out = await veronica.rpc("acoes_mes", { p_ano: 2026, p_mes: 10 });
    expect(out.data?.map((a) => a.id)).toEqual([ACOES.paulaLigacaoRealizadaOut]);
    const rNov = await rafael.rpc("acoes_mes", { p_ano: 2026, p_mes: 11 });
    expect(rNov.data?.every((a) => a.vendedor_id === R)).toBe(true);
    expect(rNov.data?.length).toBe(3);
    expect((await anon.rpc("acoes_mes", { p_ano: 2026, p_mes: 11 })).error).not.toBeNull();
  });
});

// ===========================================================================
describe("M3 — conversas e análises", () => {
  it("RLS de leitura de conversas", async () => {
    expect((await paula.from("conversas").select("vendedor_id")).data?.map((c) => c.vendedor_id)).toEqual([P, P]);
    expect((await rafael.from("conversas").select("id")).data?.map((c) => c.id)).toEqual([CONVERSAS.juliana]);
    expect((await veronica.from("conversas").select("id")).data).toHaveLength(3);
    for (const t of ["conversas", "vw_conversas", "analises_conversa"] as const) {
      expect((await anonGenerico.from(t).select("*")).data ?? [], t).toHaveLength(0);
    }
  });

  it("vw_conversas marca versão atual e correção", async () => {
    const { data } = await veronica.from("vw_conversas").select("id, versao_atual, foi_corrigida, cliente_nome, vendedor_nome");
    const por = Object.fromEntries((data ?? []).map((c) => [c.id, c]));
    expect(por[CONVERSAS.marcosOriginal]).toMatchObject({ versao_atual: false, foi_corrigida: false });
    expect(por[CONVERSAS.marcosCorrecao]).toMatchObject({ versao_atual: true, foi_corrigida: true, cliente_nome: "Marcos Teixeira", vendedor_nome: "Paula Lima" });
    expect(por[CONVERSAS.juliana]).toMatchObject({ versao_atual: true, foi_corrigida: false });
  });

  it("vendedor não lê análises; gestora lê e registra", async () => {
    expect((await paula.from("analises_conversa").select("id")).data).toHaveLength(0);
    expect((await rafael.from("analises_conversa").select("id")).data).toHaveLength(0);
    expect((await veronica.from("analises_conversa").select("id")).data).toHaveLength(1);
    const ins = await veronica.from("analises_conversa")
      .insert({ conversa_id: CONVERSAS.marcosCorrecao, comentario: "Teste A1" }).select("id, gestora_id").single();
    expect(ins.error).toBeNull();
    criadas.analises.push(ins.data!.id);
    expect(ins.data!.gestora_id).toBe(USUARIOS.veronica.id);
    expect((await rafael.from("analises_conversa").insert({ conversa_id: CONVERSAS.juliana, comentario: "x", gestora_id: R })).error).not.toBeNull();
    expect((await anon.from("analises_conversa").insert({ conversa_id: CONVERSAS.juliana, comentario: "x" })).error).not.toBeNull();
    // sem UPDATE
    const up = await veronica.from("analises_conversa").update({ comentario: "mudou" }).eq("id", ins.data!.id).select("id");
    expect(up.error).not.toBeNull();
  });

  it("correção cria nova versão e preserva a anterior; só uma correção por versão", async () => {
    const orig = await rafael.from("conversas").insert({
      cliente_id: CLIENTES.carlos, vendedor_id: R, canal: "whatsapp", ocorrida_em: "2026-11-12T10:00:00-03:00", conteudo: "Original",
    }).select("id, registrada_por").single();
    expect(orig.error).toBeNull();
    criadas.conversas.push(orig.data!.id);
    expect(orig.data!.registrada_por).toBe(R);

    const corr = await rafael.from("conversas").insert({
      cliente_id: CLIENTES.carlos, vendedor_id: R, canal: "whatsapp", ocorrida_em: "2026-11-12T10:00:00-03:00",
      conteudo: "Corrigida", substitui_conversa_id: orig.data!.id, motivo_correcao: "Erro de digitação",
    }).select("id").single();
    expect(corr.error).toBeNull();
    criadas.conversas.push(corr.data!.id);

    const anterior = await rafael.from("vw_conversas").select("conteudo, versao_atual").eq("id", orig.data!.id).single();
    expect(anterior.data).toEqual({ conteudo: "Original", versao_atual: false });

    const segunda = await rafael.from("conversas").insert({
      cliente_id: CLIENTES.carlos, vendedor_id: R, canal: "whatsapp", ocorrida_em: "2026-11-12T10:00:00-03:00",
      conteudo: "De novo", substitui_conversa_id: orig.data!.id, motivo_correcao: "x",
    });
    expect(segunda.error?.code).toBe("23505");

    // sem UPDATE nem DELETE
    expect((await rafael.from("conversas").update({ conteudo: "editada" }).eq("id", orig.data!.id).select("id")).error).not.toBeNull();
    await rafael.from("conversas").delete().eq("id", orig.data!.id);
    expect((await rafael.from("conversas").select("id").eq("id", orig.data!.id)).data).toHaveLength(1);
  });

  it("bloqueios de criação: gestora, cliente alheio, correção de conversa alheia, anônimo", async () => {
    const base = { canal: "telefone" as const, ocorrida_em: "2026-11-12T10:00:00-03:00", conteudo: "x" };
    expect((await veronica.from("conversas").insert({ ...base, cliente_id: CLIENTES.marcos, vendedor_id: P })).error).not.toBeNull();
    expect((await paula.from("conversas").insert({ ...base, cliente_id: CLIENTES.juliana })).error).not.toBeNull();
    expect((await paula.from("conversas").insert({ ...base, cliente_id: CLIENTES.juliana, vendedor_id: R })).error).not.toBeNull();
    expect((await paula.from("conversas").insert({
      ...base, cliente_id: CLIENTES.marcos, substitui_conversa_id: CONVERSAS.juliana, motivo_correcao: "x",
    })).error?.code).toBe("23514");
    expect((await anon.from("conversas").insert({ ...base, cliente_id: CLIENTES.marcos, vendedor_id: P })).error).not.toBeNull();
  });

  it("restrições de conversas", async () => {
    await emTransacaoDesfeita(async (c) => {
      const ins = (cols: string, vals: unknown[]) => erroSql(c,
        `insert into public.conversas (cliente_id, vendedor_id, registrada_por, canal, ocorrida_em, ${cols})
         values ($1, $2, $2, 'outro', now(), ${vals.map((_, i) => `$${i + 3}`).join(", ")})`,
        [CLIENTES.marcos, P, ...vals]);
      expect((await ins("conteudo", ["  "]))?.code).toBe("23514");
      expect((await ins("conteudo", ["a".repeat(20001)]))?.code).toBe("23514");
      expect(await ins("conteudo", ["a".repeat(20000)])).toBeNull();
      // correção sem motivo
      expect((await ins("conteudo, substitui_conversa_id", ["x", CONVERSAS.marcosCorrecao]))?.code).toBe("23514");
      // negociação de outro cliente
      expect((await ins("conteudo, negociacao_id", ["x", NEGOCIACOES.beatrizEmNegociacao]))?.code).toBe("23514");
      // vendedor diferente do dono
      expect((await erroSql(c, "insert into public.conversas (cliente_id, vendedor_id, registrada_por, canal, ocorrida_em, conteudo) values ($1, $2, $2, 'outro', now(), 'x')", [CLIENTES.marcos, R]))?.code).toBe("42501");
      // conteúdo de análise
      expect((await erroSql(c, "insert into public.analises_conversa (conversa_id, gestora_id, comentario) values ($1, $2, '')", [CONVERSAS.juliana, USUARIOS.veronica.id]))?.code).toBe("23514");
      expect((await erroSql(c, "insert into public.analises_conversa (conversa_id, gestora_id, comentario) values ($1, $2, $3)", [CONVERSAS.juliana, USUARIOS.veronica.id, "a".repeat(5001)]))?.code).toBe("23514");
    });
  });
});

// ===========================================================================
describe("D2-04 — funções de gatilho sem EXECUTE para anon", () => {
  it("nenhuma função de public que retorna trigger é executável por anon", async () => {
    await emTransacaoDesfeita(async (c) => {
      const r = await c.query(`
        select p.oid::regprocedure::text as funcao
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.prorettype = 'trigger'::regtype
          and has_function_privilege('anon', p.oid, 'execute')`);
      expect(r.rows.map((x) => x.funcao)).toEqual([]);
      const total = await c.query(`
        select count(*)::int as n from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.prorettype = 'trigger'::regtype`);
      expect(total.rows[0].n).toBeGreaterThanOrEqual(11);
    });
  });
});
