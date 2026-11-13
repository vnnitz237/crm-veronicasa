import { describe, expect, it } from "vitest";
import { chaveTelefone, deslocarMes, ehDataValida, ehUuid, lerMes, lerValorMonetario, mesAtual, normalizarTelefone } from "@/lib/validacao";
import { formatarData } from "@/lib/formato";

describe("validação", () => {
  it("normaliza telefone", () => {
    expect(normalizarTelefone("(11) 90000-0001")).toBe("11900000001");
    expect(normalizarTelefone("123")).toBeNull();
  });

  it("regressão: com ou sem +55 gera a mesma chave", () => {
    expect(normalizarTelefone("+55 (11) 90000-0001")).toBe("11900000001");
    expect(normalizarTelefone("5511900000001")).toBe("11900000001");
    expect(normalizarTelefone("+55 11 9000-0001")).toBe("1190000001"); // 12 dígitos: 55 + DDD + 8
  });

  it("regressão: 8 e 9 dígitos locais continuam distintos", () => {
    expect(normalizarTelefone("(11) 9000-0001")).toBe("1190000001");
    expect(normalizarTelefone("(11) 90000-0001")).toBe("11900000001");
  });

  it("regressão: número local do DDD 55 não perde o DDD", () => {
    expect(normalizarTelefone("(55) 99999-0000")).toBe("55999990000");
    expect(normalizarTelefone("(55) 9999-0000")).toBe("5599990000");
    expect(normalizarTelefone("+55 (55) 99999-0000")).toBe("55999990000");
  });

  it("regressão: formatos fora de DDD + 8/9 dígitos são recusados", () => {
    expect(normalizarTelefone("011900000001")).toBeNull(); // 12 dígitos sem DDI 55
    expect(normalizarTelefone("+351 912 345 678 90")).toBeNull(); // 14 dígitos
    expect(chaveTelefone("011900000001")).toBe("011900000001");
  });
  it("valida datas de calendário", () => {
    expect(ehDataValida("2026-10-31")).toBe(true);
    expect(ehDataValida("2026-11-31")).toBe(false);
    expect(ehDataValida("31/10/2026")).toBe(false);
  });
  it("lê valores em reais", () => {
    expect(lerValorMonetario("1.200,00")).toBe(1200);
    expect(lerValorMonetario("R$ 650,5")).toBe(650.5);
    expect(lerValorMonetario("1200.75")).toBe(1200.75);
    expect(lerValorMonetario("abc")).toBeNull();
    expect(lerValorMonetario("-5")).toBeNull();
  });
  it("lê e navega meses", () => {
    expect(lerMes("2026-10", { ano: 2000, mes: 1 })).toEqual({ ano: 2026, mes: 10 });
    expect(lerMes("2026-13", { ano: 2000, mes: 1 })).toEqual({ ano: 2000, mes: 1 });
    expect(deslocarMes({ ano: 2026, mes: 12 }, 1)).toEqual({ ano: 2027, mes: 1 });
    expect(deslocarMes({ ano: 2026, mes: 1 }, -1)).toEqual({ ano: 2025, mes: 12 });
  });
  it("usa o fuso de São Paulo para o mês atual", () => {
    // 01/11/2026 01:00 UTC ainda é 31/10/2026 em São Paulo
    expect(mesAtual(new Date("2026-11-01T01:00:00Z"))).toEqual({ ano: 2026, mes: 10 });
  });
  it("formata data sem deslocar o dia", () => {
    expect(formatarData("2026-10-31")).toBe("31/10/2026");
  });
  it("reconhece UUID", () => {
    expect(ehUuid("d1000000-0000-4000-8000-000000000001")).toBe(true);
    expect(ehUuid("1 or 1=1")).toBe(false);
  });
});
