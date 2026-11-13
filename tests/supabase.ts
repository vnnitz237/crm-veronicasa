import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { SENHA, USUARIOS } from "./fixtures";

function env(nome: string) {
  const valor = process.env[nome];
  if (!valor) throw new Error(`${nome} ausente. Rode \`npm run env:local\`.`);
  return valor;
}

const opcoes = { auth: { persistSession: false, autoRefreshToken: false } };

export function clienteAnonimo(): SupabaseClient<Database> {
  return createClient<Database>(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), opcoes);
}

export async function logarComo(usuario: keyof typeof USUARIOS): Promise<SupabaseClient<Database>> {
  const cliente = clienteAnonimo();
  const { error } = await cliente.auth.signInWithPassword({ email: USUARIOS[usuario].email, password: SENHA });
  if (error) throw new Error(`Login de ${usuario} falhou: ${error.message}`);
  return cliente;
}

/** Cliente administrativo: SOMENTE para preparar e limpar dados de teste. */
export function clienteAdmin(): SupabaseClient<Database> {
  return createClient<Database>(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), opcoes);
}

export async function limpar(ids: { negociacoes: string[]; clientes: string[] }) {
  const admin = clienteAdmin();
  if (ids.negociacoes.length) {
    const { error } = await admin.from("negociacoes").delete().in("id", ids.negociacoes);
    if (error) throw error;
  }
  if (ids.clientes.length) {
    const { error } = await admin.from("clientes").delete().in("id", ids.clientes);
    if (error) throw error;
  }
}
