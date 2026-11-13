/**
 * CSV para o Excel em português: BOM UTF-8, separador `;`, quebra CRLF,
 * números com 2 casas e vírgula decimal, datas `dd/mm/aaaa`. Função pura.
 */
const BOM = "﻿";
const DATA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
// Células que o Excel interpretaria como fórmula.
const INICIO_PERIGOSO = /^[=+\-@\t\r]/;

function formatarNumero(n: number): string {
  if (!Number.isFinite(n)) return "";
  return n.toFixed(2).replace(".", ",");
}

function celula(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return "";
  let texto: string;
  if (typeof valor === "number") {
    texto = formatarNumero(valor);
  } else {
    const data = DATA_ISO.exec(valor);
    texto = data ? `${data[3]}/${data[2]}/${data[1]}` : valor;
    if (INICIO_PERIGOSO.test(texto)) texto = `'${texto}`;
  }
  if (/[;"\r\n]/.test(texto)) texto = `"${texto.replace(/"/g, '""')}"`;
  return texto;
}

export function gerarCsv(colunas: string[], linhas: (string | number | null)[][]): string {
  const todas = [colunas, ...linhas].map((l) => l.map(celula).join(";"));
  return BOM + todas.join("\r\n") + "\r\n";
}
