import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { supabaseEnv } from "./env";

/**
 * Cliente Supabase do usuário logado (usa a chave pública + cookies de sessão).
 * Toda leitura e escrita passa pela RLS do banco: nunca use a chave secreta aqui.
 */
export async function criarClienteSupabase() {
  const cookieStore = await cookies();
  const { url, chavePublica } = supabaseEnv();

  return createServerClient<Database>(url, chavePublica, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Chamado a partir de um Server Component: o proxy renova a sessão.
        }
      },
    },
  });
}
