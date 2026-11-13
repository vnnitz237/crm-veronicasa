import { describe, expect, it } from "vitest";
import {
  agruparExecucaoPorVendedor,
  consolidarExecucao,
  estaAtrasada,
  situacaoExecucao,
  type LinhaExecucao,
} from "@/lib/relatorio-execucao";

const NOV = { ano: 2026, mes: 11 };

function linha(p: Partial<LinhaExecucao>): LinhaExecucao {
  return {
    id: Math.random().toString(36),
    cliente_nome: "Cliente Fictício",
    vendedor_id: "v1",
    vendedor_nome: "Vendedora Um",
    servico_nome: "Serviço",
    unidade_nome: "Unidade",
    valor: 100,
    status_execucao: "pendente",
    data_venda: "2026-10-01",
    data_execucao_prevista: null,
    data_execucao_realizada: null,
    motivo_cancelamento_execucao: null,
    ...p,
  };
}

describe("relatorio-execucao", () => {
  it("atrasada = pendente com prevista anterior a hoje", () => {
    expect(estaAtrasada(linha({ data_execucao_prevista: "2026-11-04" }), "2026-11-13")).toBe(true);
    expect(estaAtrasada(linha({ data_execucao_prevista: "2026-11-13" }), "2026-11-13")).toBe(false);
    expect(estaAtrasada(linha({ status_execucao: "cancelada", data_execucao_prevista: "2026-11-01", motivo_cancelamento_execucao: "x" }), "2026-11-13")).toBe(false);
    expect(situacaoExecucao(linha({ data_execucao_prevista: "2026-11-20" }), "2026-11-13")).toBe("pendente");
    expect(situacaoExecucao(linha({ data_execucao_prevista: "2026-11-10" }), "2026-11-13")).toBe("atrasada");
    expect(situacaoExecucao(linha({ status_execucao: null }), "2026-11-13")).toBeNull();
  });

  it("consolida realizadas (valor), pendentes, atrasadas e canceladas do mês", () => {
    const linhas = [
      linha({ status_execucao: "realizada", data_execucao_realizada: "2026-11-02", valor: 1200.1 }),
      linha({ status_execucao: "realizada", data_execucao_realizada: "2026-11-30", valor: 300.2 }),
      linha({ status_execucao: "realizada", data_execucao_realizada: "2026-10-20", valor: 999 }), // outro mês
      linha({ data_execucao_prevista: "2026-11-04" }), // atrasada
      linha({ data_execucao_prevista: "2026-11-10" }), // atrasada
      linha({ data_execucao_prevista: "2026-11-25" }), // pendente no prazo
      linha({ data_execucao_prevista: "2026-12-01" }), // outro mês
      linha({ status_execucao: "cancelada", data_execucao_prevista: "2026-11-15", motivo_cancelamento_execucao: "Desistiu" }),
    ];
    expect(consolidarExecucao(linhas, NOV, "2026-11-13")).toEqual({
      realizadas: 2,
      valorExecutado: 1500.3,
      pendentes: 3,
      atrasadas: 2,
      canceladas: 1,
    });
  });

  it("lista vazia dá zeros", () => {
    expect(consolidarExecucao([], NOV, "2026-11-13")).toEqual({ realizadas: 0, valorExecutado: 0, pendentes: 0, atrasadas: 0, canceladas: 0 });
  });

  it("agrupa por vendedor", () => {
    const g = agruparExecucaoPorVendedor(
      [
        linha({ vendedor_id: "v2", vendedor_nome: "Bia", status_execucao: "realizada", data_execucao_realizada: "2026-11-03" }),
        linha({ vendedor_id: "v1", vendedor_nome: "Ana", data_execucao_prevista: "2026-11-01" }),
      ],
      NOV,
      "2026-11-13",
    );
    expect(g.map((x) => [x.vendedor_nome, x.realizadas, x.atrasadas])).toEqual([["Ana", 0, 1], ["Bia", 1, 0]]);
  });
});
