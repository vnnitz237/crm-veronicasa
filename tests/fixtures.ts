// Identificadores dos dados FICTÍCIOS de supabase/seed.sql
export const SENHA = "demo-crm-2026";

export const USUARIOS = {
  paula: { id: "11111111-1111-4111-8111-111111111111", email: "paula@exemplo.test", nome: "Paula Lima" },
  rafael: { id: "22222222-2222-4222-8222-222222222222", email: "rafael@exemplo.test", nome: "Rafael Souza" },
  veronica: { id: "33333333-3333-4333-8333-333333333333", email: "veronica@exemplo.test", nome: "Verônica Sá" },
} as const;

export const UNIDADES = {
  centro: "a1000000-0000-4000-8000-000000000001",
  norte: "a1000000-0000-4000-8000-000000000002",
  sul: "a1000000-0000-4000-8000-000000000003",
} as const;

export const SERVICOS = {
  pacoteMensal: "b1000000-0000-4000-8000-000000000001",
  avaliacao: "b1000000-0000-4000-8000-000000000002",
  consultoria: "b1000000-0000-4000-8000-000000000003",
} as const;

export const CLIENTES = {
  marcos: "c1000000-0000-4000-8000-000000000001", // Paula
  beatriz: "c1000000-0000-4000-8000-000000000002", // Paula
  juliana: "c1000000-0000-4000-8000-000000000003", // Rafael
  carlos: "c1000000-0000-4000-8000-000000000004", // Rafael
} as const;

export const NEGOCIACOES = {
  marcosPacoteFechouOut: "d1000000-0000-4000-8000-000000000001", // venda 28/10, execução 04/11
  marcosAvaliacaoPerdidaOut: "d1000000-0000-4000-8000-000000000002",
  beatrizEmNegociacao: "d1000000-0000-4000-8000-000000000003",
  julianaConsultoriaFechouOut: "d1000000-0000-4000-8000-000000000004",
  julianaPacoteFechouNov: "d1000000-0000-4000-8000-000000000005",
  carlosEmNegociacao: "d1000000-0000-4000-8000-000000000006",
} as const;

/** Telefone fictício único (faixa 1198xxxxxxx, fora da faixa do seed). */
export function telefoneFicticio() {
  return `1198${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
}
