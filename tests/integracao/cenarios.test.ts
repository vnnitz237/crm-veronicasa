/**
 * Cenários de aceite validados direto no banco local, com usuários reais
 * autenticados (chave pública + RLS), exatamente como a aplicação acessa.
 * Pré-condição: banco recém-resetado (`npm run db:reset`).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { consolidar, type LinhaResultado } from "@/lib/relatorio";
import { CLIENTES, NEGOCIACOES, SERVICOS, UNIDADES, USUARIOS, telefoneFicticio } from "../fixtures";
import { clienteAdmin, clienteAnonimo, limpar, logarComo } from "../supabase";

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

async function relatorio(db: Db, ano: number, mes: number) {
  const { data, error } = await db.rpc("negociacoes_resultado_mes", { p_ano: ano, p_mes: mes });
  if (error) throw error;
  return data as LinhaResultado[];
}

async function novoClienteDaPaula(nome: string) {
  const { data, error } = await paula
    .from("clientes")
    .insert({ nome, telefone: telefoneFicticio(), vendedor_id: USUARIOS.paula.id })
    .select("id")
    .single();
  if (error) throw error;
  criados.clientes.push(data.id);
  return data.id;
}

async function novaNegociacaoDaPaula(clienteId: string, servico: string, unidade: string, valor: number) {
  const { data, error } = await paula
    .from("negociacoes")
    .insert({ cliente_id: clienteId, vendedor_id: USUARIOS.paula.id, servico_id: servico, unidade_id: unidade, valor })
    .select("id, status")
    .single();
  if (error) throw error;
  criados.negociacoes.push(data.id);
  return data;
}

// ---------------------------------------------------------------------------
describe("Cenário 1 — um cliente com duas negociações e resultados diferentes", () => {
  it("dados de demonstração: Marcos tem uma negociação fechada e outra não fechada, separadas", async () => {
    const { data, error } = await paula
      .from("vw_negociacoes")
      .select("id, servico_nome, unidade_nome, status, data_venda, data_perda, motivo_perda")
      .eq("cliente_id", CLIENTES.marcos)
      .order("id");
    expect(error).toBeNull();
    expect(data).toEqual([
      { id: NEGOCIACOES.marcosPacoteFechouOut, servico_nome: "Pacote Mensal", unidade_nome: "Unidade Centro",
        status: "fechou", data_venda: "2026-10-28", data_perda: null, motivo_perda: null },
      { id: NEGOCIACOES.marcosAvaliacaoPerdidaOut, servico_nome: "Avaliação Completa", unidade_nome: "Unidade Norte",
        status: "nao_fechou", data_venda: null, data_perda: "2026-10-30", motivo_perda: "Preço" },
    ]);
  });

  it("fluxo completo: vendedora cria cliente, duas negociações, fecha uma e perde a outra", async () => {
    const clienteId = await novoClienteDaPaula("Cliente Teste Cenário 1");
    const a = await novaNegociacaoDaPaula(clienteId, SERVICOS.pacoteMensal, UNIDADES.centro, 900);
    const b = await novaNegociacaoDaPaula(clienteId, SERVICOS.avaliacao, UNIDADES.sul, 300);
    expect(a.status).toBe("em_negociacao");
    expect(b.status).toBe("em_negociacao");

    // Setembro/2026 para não alterar os totais de outubro usados no cenário 2.
    const fechar = await paula.from("negociacoes")
      .update({ status: "fechou", data_venda: "2026-09-10", data_execucao_prevista: "2026-09-20" })
      .eq("id", a.id).select("id");
    expect(fechar.error).toBeNull();
    expect(fechar.data).toHaveLength(1);

    const perder = await paula.from("negociacoes")
      .update({ status: "nao_fechou", data_perda: "2026-09-12", motivo_perda: "Agenda / horário" })
      .eq("id", b.id).select("id");
    expect(perder.error).toBeNull();

    const { data } = await paula.from("negociacoes").select("id, status").eq("cliente_id", clienteId).order("valor", { ascending: false });
    expect(data).toEqual([{ id: a.id, status: "fechou" }, { id: b.id, status: "nao_fechou" }]);

    // No relatório, conta como 1 venda fechada + 1 não fechada (não "1 cliente").
    const doCliente = (await relatorio(paula, 2026, 9)).filter((l) => l.cliente_nome === "Cliente Teste Cenário 1");
    expect(consolidar(doCliente)).toMatchObject({ fechadas: 1, perdidas: 1, valorVendido: 900, conversao: 0.5 });

    // Histórico registrou a mudança de status com autoria.
    const { data: hist } = await paula.from("historico_negociacoes")
      .select("campo, valor_anterior, valor_novo, alterado_por").eq("negociacao_id", a.id).eq("campo", "status");
    expect(hist).toEqual([{ campo: "status", valor_anterior: "em_negociacao", valor_novo: "fechou", alterado_por: USUARIOS.paula.id }]);
  });

  it("regras: fechar sem data da venda e perder sem motivo são recusados pelo banco", async () => {
    const clienteId = await novoClienteDaPaula("Cliente Teste Regras");
    const n = await novaNegociacaoDaPaula(clienteId, SERVICOS.consultoria, UNIDADES.norte, 500);

    const semData = await paula.from("negociacoes").update({ status: "fechou" }).eq("id", n.id).select("id");
    expect(semData.error?.code).toBe("23514");

    const semMotivo = await paula.from("negociacoes").update({ status: "nao_fechou", data_perda: "2026-09-01" }).eq("id", n.id).select("id");
    expect(semMotivo.error?.code).toBe("23514");

    const execucaoAntes = await paula.from("negociacoes")
      .update({ status: "fechou", data_venda: "2026-09-10", data_execucao_prevista: "2026-09-01" }).eq("id", n.id).select("id");
    expect(execucaoAntes.error?.code).toBe("23514");

    const semServico = await paula.from("negociacoes")
      // @ts-expect-error servico_id é obrigatório
      .insert({ cliente_id: clienteId, vendedor_id: USUARIOS.paula.id, unidade_id: UNIDADES.norte, valor: 10 }).select("id");
    expect(semServico.error?.code).toBe("23502");
  });
});

// ---------------------------------------------------------------------------
describe("Cenário 2 — venda fechada em outubro com execução prevista para novembro", () => {
  it("aparece no relatório de vendas de OUTUBRO e não no de novembro", async () => {
    const outubro = await relatorio(veronica, 2026, 10);
    const novembro = await relatorio(veronica, 2026, 11);

    const venda = outubro.find((l) => l.id === NEGOCIACOES.marcosPacoteFechouOut);
    expect(venda).toMatchObject({ status: "fechou", data_venda: "2026-10-28", data_execucao_prevista: "2026-11-04", valor: 1200 });
    expect(novembro.some((l) => l.id === NEGOCIACOES.marcosPacoteFechouOut)).toBe(false);

    // Totais de outubro (dados de demonstração): Paula 1 fechada + 1 perdida; Rafael 1 fechada.
    expect(consolidar(outubro)).toMatchObject({ fechadas: 2, perdidas: 1, valorVendido: 2000 });
    // Novembro só tem a venda do Rafael fechada em 03/11.
    expect(novembro.map((l) => l.id)).toEqual([NEGOCIACOES.julianaPacoteFechouNov]);
  });

  it("fluxo completo: fechar em 31/10 com execução em 12/11 entra em outubro, não em novembro", async () => {
    const clienteId = await novoClienteDaPaula("Cliente Teste Cenário 2");
    const n = await novaNegociacaoDaPaula(clienteId, SERVICOS.consultoria, UNIDADES.sul, 650);
    const { error } = await paula.from("negociacoes")
      .update({ status: "fechou", data_venda: "2026-10-31", data_execucao_prevista: "2026-11-12" }).eq("id", n.id);
    expect(error).toBeNull();

    expect((await relatorio(paula, 2026, 10)).map((l) => l.id)).toContain(n.id);
    expect((await relatorio(veronica, 2026, 10)).map((l) => l.id)).toContain(n.id);
    expect((await relatorio(veronica, 2026, 11)).map((l) => l.id)).not.toContain(n.id);
    // Primeiro dia do mês seguinte fica fora (limite superior exclusivo).
    expect((await relatorio(veronica, 2026, 9)).map((l) => l.id)).not.toContain(n.id);
  });
});

// ---------------------------------------------------------------------------
describe("Cenário 3 — isolamento entre vendedores e visão da gestora", () => {
  it("Rafael não lê cliente, negociação, histórico nem relatório da Paula", async () => {
    const cliente = await rafael.from("clientes").select("id").eq("id", CLIENTES.marcos);
    expect(cliente.error).toBeNull();
    expect(cliente.data).toEqual([]);

    const neg = await rafael.from("negociacoes").select("id").eq("id", NEGOCIACOES.marcosPacoteFechouOut);
    expect(neg.data).toEqual([]);

    const vw = await rafael.from("vw_negociacoes").select("id").eq("cliente_id", CLIENTES.marcos);
    expect(vw.data).toEqual([]);

    const hist = await rafael.from("historico_negociacoes").select("id").eq("negociacao_id", NEGOCIACOES.marcosPacoteFechouOut);
    expect(hist.data).toEqual([]);

    const todosClientes = await rafael.from("clientes").select("id").order("id");
    expect(todosClientes.data?.map((c) => c.id)).toEqual([CLIENTES.juliana, CLIENTES.carlos]);

    const rel = await relatorio(rafael, 2026, 10);
    expect(rel.every((l) => l.vendedor_id === USUARIOS.rafael.id)).toBe(true);
    expect(rel.map((l) => l.id)).toEqual([NEGOCIACOES.julianaConsultoriaFechouOut]);

    const perfis = await rafael.from("perfis").select("id");
    expect(perfis.data).toEqual([{ id: USUARIOS.rafael.id }]);
  });

  it("Paula também não lê os registros do Rafael", async () => {
    const r = await paula.from("vw_negociacoes").select("id").eq("cliente_id", CLIENTES.juliana);
    expect(r.data).toEqual([]);
    const c = await paula.from("clientes").select("id").eq("id", CLIENTES.juliana);
    expect(c.data).toEqual([]);
  });

  it("Rafael não altera, não exclui e não cria registros em nome da Paula", async () => {
    const alterar = await rafael.from("negociacoes").update({ valor: 1 }).eq("id", NEGOCIACOES.marcosPacoteFechouOut).select("id");
    expect(alterar.data).toEqual([]);

    const excluir = await rafael.from("negociacoes").delete().eq("id", NEGOCIACOES.marcosPacoteFechouOut).select("id");
    expect(excluir.data ?? []).toEqual([]);

    const clienteEmNomeDaPaula = await rafael.from("clientes")
      .insert({ nome: "Invasor", telefone: telefoneFicticio(), vendedor_id: USUARIOS.paula.id });
    expect(clienteEmNomeDaPaula.error?.code).toBe("42501");

    const negociacaoNoClienteDaPaula = await rafael.from("negociacoes").insert({
      cliente_id: CLIENTES.marcos, vendedor_id: USUARIOS.rafael.id,
      servico_id: SERVICOS.consultoria, unidade_id: UNIDADES.centro, valor: 10,
    });
    expect(negociacaoNoClienteDaPaula.error?.code).toBe("42501");

    // Confirma com acesso administrativo que nada mudou.
    const { data } = await clienteAdmin().from("negociacoes").select("valor, status").eq("id", NEGOCIACOES.marcosPacoteFechouOut).single();
    expect(data).toEqual({ valor: 1200, status: "fechou" });
  });

  it("vendedora não exclui nem transfere a própria negociação ou cliente", async () => {
    const excluir = await paula.from("negociacoes").delete().eq("id", NEGOCIACOES.beatrizEmNegociacao).select("id");
    expect(excluir.data ?? []).toEqual([]);
    const transferir = await paula.from("clientes").update({ vendedor_id: USUARIOS.rafael.id }).eq("id", CLIENTES.beatriz);
    expect(transferir.error).not.toBeNull();
  });

  it("gestora consulta os registros dos dois vendedores, sem poder editá-los", async () => {
    const clientes = await veronica.from("clientes").select("id, vendedor_id");
    const vendedores = new Set(clientes.data?.map((c) => c.vendedor_id));
    expect(vendedores).toEqual(new Set([USUARIOS.paula.id, USUARIOS.rafael.id]));

    const doMarcos = await veronica.from("vw_negociacoes").select("id").eq("cliente_id", CLIENTES.marcos);
    expect(doMarcos.data).toHaveLength(2);
    const daJuliana = await veronica.from("vw_negociacoes").select("id").eq("cliente_id", CLIENTES.juliana);
    expect(daJuliana.data).toHaveLength(2);

    const hist = await veronica.from("historico_negociacoes").select("id").eq("negociacao_id", NEGOCIACOES.marcosPacoteFechouOut);
    expect(hist.data?.length).toBeGreaterThan(0);

    const rel = await relatorio(veronica, 2026, 10);
    expect(new Set(rel.map((l) => l.vendedor_nome))).toEqual(new Set(["Paula Lima", "Rafael Souza"]));

    const editar = await veronica.from("negociacoes").update({ valor: 1 }).eq("id", NEGOCIACOES.marcosPacoteFechouOut).select("id");
    expect(editar.data).toEqual([]);
    const criar = await veronica.from("clientes").insert({ nome: "Gestora", telefone: telefoneFicticio(), vendedor_id: USUARIOS.veronica.id });
    expect(criar.error?.code).toBe("42501");
  });

  it("sem login não há acesso a nada", async () => {
    const anon = clienteAnonimo();
    const c = await anon.from("clientes").select("id");
    expect(c.data ?? []).toEqual([]);
    const r = await anon.rpc("negociacoes_resultado_mes", { p_ano: 2026, p_mes: 10 });
    expect(r.error).not.toBeNull();
  });
});
