import { describe, expect, it } from "vitest";
import { cadeiaDeVersoes, formatarDataHora, lerDataHoraLocal, paraDataHoraLocal } from "@/lib/conversas";

describe("datas de conversa (São Paulo)", () => {
  it("lê datetime-local como -03:00", () => {
    expect(lerDataHoraLocal("2026-11-13T09:30")).toBe("2026-11-13T09:30:00-03:00");
  });
  it("rejeita valores inválidos", () => {
    expect(lerDataHoraLocal("")).toBeNull();
    expect(lerDataHoraLocal("2026-02-30T10:00")).toBeNull();
    expect(lerDataHoraLocal("2026-11-13T24:00")).toBeNull();
    expect(lerDataHoraLocal("13/11/2026 10:00")).toBeNull();
  });
  it("converte timestamptz para o horário de São Paulo", () => {
    expect(paraDataHoraLocal("2026-11-13T01:15:00Z")).toBe("2026-11-12T22:15");
    expect(formatarDataHora("2026-11-13T12:00:00+00:00")).toBe("13/11/2026 09:00");
    expect(formatarDataHora(null)).toBe("—");
  });
  it("ida e volta preserva o valor", () => {
    expect(paraDataHoraLocal(lerDataHoraLocal("2026-01-05T23:59")!)).toBe("2026-01-05T23:59");
  });
});

describe("cadeiaDeVersoes", () => {
  const v = [
    { id: "a", substitui_conversa_id: null },
    { id: "b", substitui_conversa_id: "a" },
    { id: "c", substitui_conversa_id: "b" },
    { id: "x", substitui_conversa_id: null },
  ];
  it("monta da mais antiga para a mais nova a partir de qualquer versão", () => {
    for (const id of ["a", "b", "c"]) expect(cadeiaDeVersoes(v, id).map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
  it("conversa sem correção é cadeia de 1", () => {
    expect(cadeiaDeVersoes(v, "x").map((x) => x.id)).toEqual(["x"]);
  });
  it("id desconhecido dá vazio", () => {
    expect(cadeiaDeVersoes(v, "z")).toEqual([]);
  });
});
