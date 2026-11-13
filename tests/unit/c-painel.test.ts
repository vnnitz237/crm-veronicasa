import { describe, expect, it } from "vitest";
import { consolidarPainel } from "@/lib/painel";
import type { LinhaResultado } from "@/lib/relatorio";
import type { LinhaExecucao } from "@/lib/relatorio-execucao";

const NOV = { ano: 2026, mes: 11 };

function venda(p: Partial<LinhaResultado>): LinhaResultado {
  return {
    id: Math.random().toString(36), cliente_nome: "C", vendedor_id: "v1", vendedor_nome: "Ana",
    servico_nome: "S", unidade_nome: "U", valor: 100, status: "fechou",
    data_venda: "2026-11-02", data_perda: null, data_execucao_prevista: null, ...p,
  };
}

function exec(p: Partial<LinhaExecucao>): LinhaExecucao {
  return {
    id: Math.random().toString(36), cliente_nome: "C", vendedor_id: "v1", vendedor_nome: "Ana",
    servico_nome: "S", unidade_nome: "U", valor: 100, status_execucao: "realizada", data_venda: "2026-10-01",
    data_execucao_prevista: null, data_execucao_realizada: "2026-11-05", motivo_cancelamento_execucao: null, ...p,
  };
}

describe("consolidarPainel", () => {
  it("monta cards e tabela por vendedor", () => {
    const p = consolidarPainel(
      {
        vendas: [
          venda({ valor: 1000 }),
          venda({ vendedor_id: "v2", vendedor_nome: "Bia", valor: 2500.5 }),
          venda({ vendedor_id: "v2", vendedor_nome: "Bia", status: "nao_fechou", data_venda: null, data_perda: "2026-11-03" }),
        ],
        execucoes: [
          exec({}),
          exec({ status_execucao: "pendente", data_execucao_realizada: null, data_execucao_prevista: "2026-11-04" }),
          exec({ vendedor_id: "v3", vendedor_nome: "Caio", data_execucao_realizada: "2026-10-30" }), // fora do mês
        ],
        acoes: [
          { vendedor_id: "v1", vendedor_nome: "Ana", situacao: "realizada" },
          { vendedor_id: "v1", vendedor_nome: "Ana", situacao: "planejada" },
          { vendedor_id: "v3", vendedor_nome: "Caio", situacao: "realizada" },
          { vendedor_id: "v3", vendedor_nome: "Caio", situacao: "cancelada" },
        ],
        conversas: 7,
      },
      NOV,
      "2026-11-13",
    );
    expect(p.vendas.fechadas).toBe(2);
    expect(p.vendas.valorVendido).toBe(3500.5);
    expect(p.vendas.conversao).toBeCloseTo(2 / 3);
    expect(p.execucoes).toMatchObject({ realizadas: 1, pendentes: 1, atrasadas: 1 });
    expect(p.acoes).toEqual({ realizadas: 2, planejadas: 1, canceladas: 1 });
    expect(p.conversas).toBe(7);
    expect(p.porVendedor).toEqual([
      { vendedor_id: "v2", vendedor_nome: "Bia", vendas: 1, valor: 2500.5, acoesRealizadas: 0, execucoesRealizadas: 0 },
      { vendedor_id: "v1", vendedor_nome: "Ana", vendas: 1, valor: 1000, acoesRealizadas: 1, execucoesRealizadas: 1 },
      { vendedor_id: "v3", vendedor_nome: "Caio", vendas: 0, valor: 0, acoesRealizadas: 1, execucoesRealizadas: 0 },
    ]);
  });

  it("mês vazio", () => {
    const p = consolidarPainel({ vendas: [], execucoes: [], acoes: [], conversas: 0 }, NOV, "2026-11-13");
    expect(p.porVendedor).toEqual([]);
    expect(p.vendas.conversao).toBeNull();
  });
});
