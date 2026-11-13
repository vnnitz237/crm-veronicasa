import { describe, expect, it } from "vitest";
import { agruparPor, consolidar, type LinhaResultado } from "@/lib/relatorio";

function linha(p: Partial<LinhaResultado>): LinhaResultado {
  return {
    id: crypto.randomUUID(),
    cliente_nome: "Cliente Fictício",
    vendedor_id: "v1",
    vendedor_nome: "Paula Lima",
    servico_nome: "Pacote Mensal",
    unidade_nome: "Unidade Centro",
    valor: 100,
    status: "fechou",
    data_venda: "2026-10-01",
    data_perda: null,
    data_execucao_prevista: null,
    ...p,
  };
}

describe("consolidar", () => {
  it("conta fechadas e perdidas, soma só o valor das fechadas e calcula conversão", () => {
    const r = consolidar([
      linha({ valor: 1200 }),
      linha({ valor: 800.5 }),
      linha({ status: "nao_fechou", valor: 350, data_venda: null, data_perda: "2026-10-30" }),
    ]);
    expect(r).toEqual({ fechadas: 2, perdidas: 1, valorVendido: 2000.5, conversao: 2 / 3, ticketMedio: 1000.25 });
  });

  it("sem resultados não divide por zero", () => {
    expect(consolidar([])).toEqual({ fechadas: 0, perdidas: 0, valorVendido: 0, conversao: null, ticketMedio: null });
  });

  it("um mesmo cliente com duas negociações conta duas vezes, uma em cada resultado", () => {
    const r = consolidar([
      linha({ cliente_nome: "Marcos Teixeira", valor: 1200 }),
      linha({ cliente_nome: "Marcos Teixeira", status: "nao_fechou", data_venda: null, data_perda: "2026-10-30" }),
    ]);
    expect(r.fechadas).toBe(1);
    expect(r.perdidas).toBe(1);
    expect(r.conversao).toBe(0.5);
  });
});

describe("agruparPor", () => {
  it("agrupa por serviço sem misturar resultados", () => {
    const grupos = agruparPor(
      [
        linha({ servico_nome: "Pacote Mensal", valor: 1200 }),
        linha({ servico_nome: "Avaliação Completa", status: "nao_fechou", data_venda: null, data_perda: "2026-10-30" }),
      ],
      "servico_nome",
    );
    expect(grupos).toEqual([
      { chave: "Pacote Mensal", fechadas: 1, perdidas: 0, valorVendido: 1200, conversao: 1, ticketMedio: 1200 },
      { chave: "Avaliação Completa", fechadas: 0, perdidas: 1, valorVendido: 0, conversao: 0, ticketMedio: null },
    ]);
  });
});
