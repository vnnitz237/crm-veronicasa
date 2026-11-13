import { describe, expect, it } from "vitest";
import { acoesPorResponsavel, acoesPorTipo, totaisAcoes, type LinhaAcao } from "@/lib/acoes";

function a(p: Partial<LinhaAcao>): LinhaAcao {
  return { id: crypto.randomUUID(), tipo: "ligacao", situacao: "planejada", vendedor_id: "v1", vendedor_nome: "Paula Lima", ...p };
}

const linhas: LinhaAcao[] = [
  a({ situacao: "planejada" }),
  a({ situacao: "planejada", tipo: "visita" }),
  a({ situacao: "realizada", tipo: "visita" }),
  a({ situacao: "cancelada", tipo: "proposta", vendedor_id: "v2", vendedor_nome: "Rafael Souza" }),
  a({ situacao: "realizada", tipo: "ligacao", vendedor_id: "v2", vendedor_nome: "Rafael Souza" }),
  a({ situacao: "planejada", tipo: "follow_up", vendedor_id: "v3", vendedor_nome: "Ana Dias" }),
];

describe("totaisAcoes", () => {
  it("separa planejadas, realizadas e canceladas", () => {
    expect(totaisAcoes(linhas)).toEqual({ planejadas: 3, realizadas: 2, canceladas: 1, total: 6 });
  });
  it("mês vazio dá zeros", () => {
    expect(totaisAcoes([])).toEqual({ planejadas: 0, realizadas: 0, canceladas: 0, total: 0 });
  });
});

describe("acoesPorTipo", () => {
  it("agrupa na ordem dos tipos e omite tipos sem ações", () => {
    const g = acoesPorTipo(linhas);
    expect(g.map((x) => x.chave)).toEqual(["ligacao", "visita", "proposta", "follow_up"]);
    expect(g.find((x) => x.chave === "visita")).toMatchObject({ rotulo: "Visita", planejadas: 1, realizadas: 1, canceladas: 0 });
    expect(g.find((x) => x.chave === "proposta")).toMatchObject({ canceladas: 1, total: 1 });
  });
});

describe("acoesPorResponsavel", () => {
  it("agrupa por vendedor e ordena pelo nome", () => {
    const g = acoesPorResponsavel(linhas);
    expect(g.map((x) => x.rotulo)).toEqual(["Ana Dias", "Paula Lima", "Rafael Souza"]);
    expect(g[1]).toMatchObject({ chave: "v1", planejadas: 2, realizadas: 1, canceladas: 0, total: 3 });
    expect(g[2]).toMatchObject({ planejadas: 0, realizadas: 1, canceladas: 1 });
  });
  it("soma dos grupos bate com o total", () => {
    const soma = acoesPorResponsavel(linhas).reduce((s, g) => s + g.total, 0);
    expect(soma).toBe(totaisAcoes(linhas).total);
  });
});
