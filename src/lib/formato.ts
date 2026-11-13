import type { Database } from "./supabase/database.types";

type Status = Database["public"]["Enums"]["status_negociacao"];

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatarMoeda(valor: number): string {
  return moeda.format(valor);
}

/** "2026-10-28" -> "28/10/2026" sem passar por Date (evita erro de fuso). */
export function formatarData(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

export function formatarTelefone(digitos: string): string {
  const d = digitos.startsWith("55") && digitos.length > 11 ? digitos.slice(2) : digitos;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return digitos;
}

const NOMES_MES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function nomeDoMes(ano: number, mes: number): string {
  return `${NOMES_MES[mes - 1]} de ${ano}`;
}

export const ROTULO_STATUS: Record<Status, string> = {
  em_negociacao: "Em negociação",
  fechou: "Fechou",
  nao_fechou: "Não fechou",
};

export const COR_STATUS: Record<Status, string> = {
  em_negociacao: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  fechou: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
  nao_fechou: "bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-100",
};
