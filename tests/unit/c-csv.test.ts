import { describe, expect, it } from "vitest";
import { gerarCsv } from "@/lib/csv";

describe("gerarCsv", () => {
  it("começa com BOM UTF-8, usa ; e termina linhas com CRLF", () => {
    const csv = gerarCsv(["A", "B"], [["x", "y"]]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1)).toBe("A;B\r\nx;y\r\n");
  });

  it("usa 2 casas, vírgula decimal e não separa milhar", () => {
    expect(gerarCsv(["V"], [[1234.5], [10], [-3.25], [1200], [0.1 + 0.2]]).slice(1)).toBe(
      "V\r\n1234,50\r\n10,00\r\n-3,25\r\n1200,00\r\n0,30\r\n",
    );
  });

  it("formata datas ISO como dd/mm/aaaa e nulos como vazio", () => {
    expect(gerarCsv(["D", "N"], [["2026-10-28", null]]).slice(1)).toBe("D;N\r\n28/10/2026;\r\n");
  });

  it("escapa aspas, ; e quebras de linha", () => {
    const csv = gerarCsv(["T"], [['Ana "Bia"; Silva'], ["linha1\nlinha2"]]).slice(1);
    expect(csv).toBe('T\r\n"Ana ""Bia""; Silva"\r\n"linha1\nlinha2"\r\n');
  });

  it("neutraliza injeção de fórmula em textos", () => {
    const linhas = [["=1+1"], ["+55"], ["-2"], ["@SUM(A1)"], ["\tx"], ["\rx"], ["normal"]];
    const corpo = gerarCsv(["F"], linhas).slice(1).split("\r\n");
    expect(corpo.slice(1, 5)).toEqual(["'=1+1", "'+55", "'-2", "'@SUM(A1)"]);
    expect(corpo[5]).toBe("'\tx");
    expect(corpo[6]).toBe("\"'\rx\"");
    expect(corpo[7]).toBe("normal");
  });
});
