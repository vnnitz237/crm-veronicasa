const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function ehUuid(valor: unknown): valor is string {
  return typeof valor === "string" && UUID.test(valor);
}

/**
 * Chave canônica do telefone — espelha `public.normalizar_telefone` no banco.
 * Só dígitos; remove o DDI 55 apenas quando há 12 ou 13 dígitos (55 + DDD + 8/9).
 * Números locais (10 ou 11 dígitos) não mudam: 8 e 9 dígitos continuam distintos.
 */
export function chaveTelefone(valor: string): string {
  const digitos = valor.replace(/\D/g, "");
  return /^55\d{10,11}$/.test(digitos) ? digitos.slice(2) : digitos;
}

/** Chave canônica válida (DDD + 8 ou 9 dígitos) ou null. */
export function normalizarTelefone(valor: string): string | null {
  const chave = chaveTelefone(valor);
  return /^\d{10,11}$/.test(chave) ? chave : null;
}

/** Valida uma data AAAA-MM-DD de calendário real, sem conversão de fuso. */
export function ehDataValida(valor: unknown): valor is string {
  if (typeof valor !== "string" || !DATA_ISO.test(valor)) return false;
  const [a, m, d] = valor.split("-").map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d));
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Converte "1.234,56", "1234.56" ou "1234" em número com 2 casas. */
export function lerValorMonetario(valor: string): number | null {
  const limpo = valor.trim().replace(/^R\$\s*/i, "");
  if (!limpo) return null;
  const normalizado = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  if (!/^\d+(\.\d{1,2})?$/.test(normalizado)) return null;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : null;
}

export type Mes = { ano: number; mes: number };

/** Lê "AAAA-MM"; se inválido, devolve o mês informado como padrão. */
export function lerMes(valor: unknown, padrao: Mes): Mes {
  if (typeof valor === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(valor)) {
    const [ano, mes] = valor.split("-").map(Number);
    return { ano, mes };
  }
  return padrao;
}

export function mesAtual(agora = new Date()): Mes {
  // Fuso de São Paulo para não "virar o mês" antes da hora.
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(agora);
  const ano = Number(partes.find((p) => p.type === "year")?.value);
  const mes = Number(partes.find((p) => p.type === "month")?.value);
  return { ano, mes };
}

export function hojeISO(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);
}

export function mesParaTexto({ ano, mes }: Mes): string {
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

export function deslocarMes({ ano, mes }: Mes, delta: number): Mes {
  const total = ano * 12 + (mes - 1) + delta;
  return { ano: Math.floor(total / 12), mes: (total % 12) + 1 };
}
