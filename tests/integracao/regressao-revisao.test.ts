/**
 * Regressão dos defeitos confirmados na 1ª revisão independente.
 *   1. Telefone com ou sem +55 driblava o bloqueio de duplicidade.
 *   2. "Fechou" → "Não fechou" mantinha a data de execução prevista.
 * Pré-condição: banco recém-resetado (`npm run db:reset`).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { LinhaResultado } from "@/lib/relatorio";
import { CLIENTES, SERVICOS, UNIDADES, USUARIOS } from "../fixtures";
import { clienteAdmin, limpar, logarComo } from "../supabase";

type Db = SupabaseClient<Database>;
let paula: Db;
let rafael: Db;
let veronica: Db;
const criados = { negociacoes: [] as string[], clientes: [] as string[] };

beforeAll(async () => {
  [paula, rafael, veronica] = await Promise.all([logarComo("paula"), logarComo("rafael"), logarComo("veronica")]);
});

afterAll(async () => {
  await limpar(criados);
});

/** Executa SQL como superusuário numa transação SEMPRE desfeita no fim. */
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

async function inserirCliente(db: Db, vendedor: keyof typeof USUARIOS, nome: string, telefone: string) {
  const r = await db.from("clientes")
    .insert({ nome, telefone, vendedor_id: USUARIOS[vendedor].id })
    .select("id, telefone, telefone_em_revisao")
    .maybeSingle();
  if (r.data) criados.clientes.push(r.data.id);
  return r;
}

// ===========================================================================
describe("Regressão 1 — telefone com ou sem +55", () => {
  it("Rafael não cadastra o telefone do Marcos (Paula) escrito com DDI", async () => {
    for (const tel of ["5511900000001", "+55 (11) 90000-0001", "+55 11 90000 0001"]) {
      const r = await inserirCliente(rafael, "rafael", `Dup ${tel}`, tel);
      expect(r.error?.code, tel).toBe("23505");
      // Mensagem genérica: não revela de quem é o cliente.
      expect(r.error?.message).toBe("Já existe um cliente com este telefone.");
    }
  });

  it("Paula não cadastra com DDI o telefone de um cliente do Rafael nem um dela mesma", async () => {
    expect((await inserirCliente(paula, "paula", "Dup Juliana", "+55 11 90000-0003")).error?.code).toBe("23505");
    expect((await inserirCliente(paula, "paula", "Dup Beatriz", "5511900000002")).error?.code).toBe("23505");
  });

  it("cadastro com +55 de número novo é gravado na chave canônica (sem o 55)", async () => {
    const r = await inserirCliente(paula, "paula", "Cliente Regressão DDI", "+55 (11) 97777-1234");
    expect(r.error).toBeNull();
    expect(r.data?.telefone).toBe("11977771234");
    // e o mesmo número sem DDI passa a ser duplicado
    expect((await inserirCliente(rafael, "rafael", "Dup sem DDI", "(11) 97777-1234")).error?.code).toBe("23505");
  });

  it("8 e 9 dígitos locais continuam distintos", async () => {
    const r = await inserirCliente(rafael, "rafael", "Cliente 8 dígitos", "(11) 9000-0001");
    expect(r.error).toBeNull();
    expect(r.data?.telefone).toBe("1190000001"); // ≠ 11900000001 do Marcos
  });

  it("número local do DDD 55 não perde o DDD", async () => {
    const r = await inserirCliente(paula, "paula", "Cliente DDD 55", "(55) 99876-5432");
    expect(r.error).toBeNull();
    expect(r.data?.telefone).toBe("55998765432");
  });

  it("formato inválido é recusado pelo banco", async () => {
    expect((await inserirCliente(paula, "paula", "Inválido A", "011900000001")).error?.code).toBe("23514");
    expect((await inserirCliente(paula, "paula", "Inválido B", "123")).error?.code).toBe("23514");
  });

  it("edição: trocar para um telefone existente (com DDI) é bloqueada; para um novo, é normalizada", async () => {
    const bloqueio = await paula.from("clientes").update({ telefone: "+55 11 90000-0003" }).eq("id", CLIENTES.beatriz).select("id");
    expect(bloqueio.error?.code).toBe("23505");

    const ok = await paula.from("clientes").update({ telefone: "+55 (11) 96543-2100" }).eq("id", CLIENTES.beatriz).select("telefone").single();
    expect(ok.error).toBeNull();
    expect(ok.data?.telefone).toBe("11965432100");
    // restaura o dado fictício
    await clienteAdmin().from("clientes").update({ telefone: "11900000002" }).eq("id", CLIENTES.beatriz);
  });

  it("vendedor não consegue marcar nem desmarcar 'telefone em revisão'", async () => {
    const ins = await inserirCliente(rafael, "rafael", "Tentativa de marca", "11955550000");
    expect(ins.error).toBeNull();
    const upd = await rafael.from("clientes").update({ telefone_em_revisao: true }).eq("id", ins.data!.id);
    expect(upd.error?.code).toBe("42501");
  });

  it("vendedores não leem a lista de conflitos; a gestora lê", async () => {
    expect((await rafael.from("conflitos_telefone").select("id")).data).toEqual([]);
    expect((await veronica.from("conflitos_telefone").select("id")).error).toBeNull();
  });

  it("registros já gravados: duplicata revelada pela normalização é preservada e marcada para revisão", async () => {
    await emTransacaoDesfeita(async (c) => {
      // Reproduz o estado ANTERIOR à correção (regras antigas: 10–13 dígitos, unicidade literal).
      await c.query("alter table public.clientes disable trigger clientes_telefone_canonico");
      await c.query("alter table public.clientes drop constraint clientes_telefone_canonico");
      await c.query("drop index public.clientes_telefone_unico");
      await c.query(`insert into public.clientes (id, nome, telefone, vendedor_id) values
        ('e1000000-0000-4000-8000-000000000001', 'Legado +55 do Marcos', '5511900000001', $1),
        ('e1000000-0000-4000-8000-000000000002', 'Legado +55 único',     '5511977770000', $1),
        ('e1000000-0000-4000-8000-000000000003', 'Legado 8 dígitos',     '1190000002',    $1),
        ('e1000000-0000-4000-8000-000000000004', 'Legado inválido',      '011900000001',  $2)`,
        [USUARIOS.rafael.id, USUARIOS.paula.id]);
      const antes = Number((await c.query("select count(*) from public.clientes")).rows[0].count);

      const conflitos = (await c.query(
        "select cliente_id, telefone_original, telefone_chave, motivo from public.reconciliar_telefones() order by motivo, telefone_original",
      )).rows;
      expect(conflitos).toEqual([
        { cliente_id: CLIENTES.marcos, telefone_original: "11900000001", telefone_chave: "11900000001", motivo: "duplicado" },
        { cliente_id: "e1000000-0000-4000-8000-000000000001", telefone_original: "5511900000001", telefone_chave: "11900000001", motivo: "duplicado" },
        { cliente_id: "e1000000-0000-4000-8000-000000000004", telefone_original: "011900000001", telefone_chave: "011900000001", motivo: "formato_invalido" },
      ]);

      // Nada apagado nem mesclado.
      expect(Number((await c.query("select count(*) from public.clientes")).rows[0].count)).toBe(antes);

      const estado = Object.fromEntries((await c.query(
        "select nome, telefone, telefone_em_revisao from public.clientes where id::text like 'e1%' or id = $1", [CLIENTES.marcos],
      )).rows.map((r) => [r.nome, [r.telefone, r.telefone_em_revisao]]));
      expect(estado).toEqual({
        "Marcos Teixeira": ["11900000001", true],
        "Legado +55 do Marcos": ["11900000001", true],
        "Legado +55 único": ["11977770000", false], // só normalizado
        "Legado 8 dígitos": ["1190000002", false], // inalterado (≠ 11900000002 da Beatriz)
        "Legado inválido": ["011900000001", true], // preservado como estava
      });

      // As regras novas voltam a valer sobre o resultado da reconciliação.
      await c.query("alter table public.clientes add constraint clientes_telefone_canonico check (telefone_em_revisao or telefone ~ '^[0-9]{10,11}$')");
      await c.query("create unique index clientes_telefone_unico on public.clientes (telefone) where not telefone_em_revisao");
      await c.query("alter table public.clientes enable trigger clientes_telefone_canonico");

      // Idempotente: rodar de novo não duplica conflitos.
      expect((await c.query("select * from public.reconciliar_telefones()")).rowCount).toBe(3);
      expect(Number((await c.query("select count(*) from public.conflitos_telefone")).rows[0].count)).toBe(3);

      // Um terceiro cadastro com a chave em revisão continua bloqueado para o vendedor.
      await c.query("set local role authenticated");
      await c.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: USUARIOS.rafael.id, role: "authenticated" })]);
      const terceiro = await erroSql(c,
        "insert into public.clientes (nome, telefone, vendedor_id) values ('Terceiro', '+55 11 90000-0001', $1)", [USUARIOS.rafael.id]);
      expect(terceiro?.code).toBe("23505");
    });
  });
});

// ===========================================================================
describe("Regressão 2 — 'Não fechou' não mantém execução prevista", () => {
  async function negociacaoFechada(execucao: string) {
    const cliente = await inserirCliente(paula, "paula", `Cliente Regressão Execução ${execucao}`, `1197${Math.floor(Math.random() * 1e7).toString().padStart(7, "0")}`);
    const { data, error } = await paula.from("negociacoes").insert({
      cliente_id: cliente.data!.id, vendedor_id: USUARIOS.paula.id,
      servico_id: SERVICOS.consultoria, unidade_id: UNIDADES.sul, valor: 650,
    }).select("id").single();
    if (error) throw error;
    criados.negociacoes.push(data.id);
    const f = await paula.from("negociacoes")
      .update({ status: "fechou", data_venda: "2026-10-31", data_execucao_prevista: execucao }).eq("id", data.id);
    expect(f.error).toBeNull();
    return data.id;
  }

  it("Fechou → Não fechou limpa a execução na mesma operação, mesmo sem o cliente pedir", async () => {
    const id = await negociacaoFechada("2026-11-12");

    // Atualização "ingênua" pela API: não menciona data_execucao_prevista.
    const r = await paula.from("negociacoes")
      .update({ status: "nao_fechou", data_venda: null, data_perda: "2026-11-11", motivo_perda: "Sem resposta" })
      .eq("id", id).select("status, data_execucao_prevista").single();
    expect(r.error).toBeNull();
    expect(r.data).toEqual({ status: "nao_fechou", data_execucao_prevista: null });

    // Histórico preserva a alteração, com autor e no mesmo instante da mudança de status.
    const { data: hist } = await paula.from("historico_negociacoes")
      .select("campo, valor_anterior, valor_novo, alterado_por, alterado_em")
      .eq("negociacao_id", id).in("campo", ["status", "data_execucao_prevista"]).order("id");
    const ultimos = hist!.slice(-2);
    expect(ultimos.map(({ campo, valor_anterior, valor_novo, alterado_por }) => ({ campo, valor_anterior, valor_novo, alterado_por }))).toEqual([
      { campo: "status", valor_anterior: "fechou", valor_novo: "nao_fechou", alterado_por: USUARIOS.paula.id },
      { campo: "data_execucao_prevista", valor_anterior: "2026-11-12", valor_novo: null, alterado_por: USUARIOS.paula.id },
    ]);
    expect(ultimos[0].alterado_em).toBe(ultimos[1].alterado_em);
  });

  it("contagem mensal continua a mesma: sai do mês da venda e entra no mês da recusa", async () => {
    const id = await negociacaoFechada("2026-11-20");
    const ids = async (m: number) =>
      ((await veronica.rpc("negociacoes_resultado_mes", { p_ano: 2026, p_mes: m })).data as LinhaResultado[]).map((l) => l.id);
    expect(await ids(10)).toContain(id);
    await paula.from("negociacoes")
      .update({ status: "nao_fechou", data_venda: null, data_perda: "2026-11-11", motivo_perda: "Preço" }).eq("id", id);
    expect(await ids(10)).not.toContain(id);
    expect(await ids(11)).toContain(id);
  });

  it("'Fechou' continua aceitando execução prevista", async () => {
    const id = await negociacaoFechada("2026-11-30");
    const { data } = await paula.from("negociacoes").select("data_execucao_prevista").eq("id", id).single();
    expect(data?.data_execucao_prevista).toBe("2026-11-30");
  });

  it("o banco recusa 'não fechou' com execução mesmo se o gatilho for desligado", async () => {
    await emTransacaoDesfeita(async (c) => {
      await c.query("alter table public.negociacoes disable trigger negociacoes_recusa_sem_execucao");
      const e = await erroSql(c,
        "update public.negociacoes set data_execucao_prevista = '2026-12-01' where status = 'nao_fechou'");
      expect(e?.code).toBe("23514");
      expect(e?.message).toContain("negociacoes_recusa_sem_execucao");
    });
  });
});
