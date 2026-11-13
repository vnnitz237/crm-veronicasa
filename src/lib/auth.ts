import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { criarClienteSupabase } from "./supabase/server";
import type { Database } from "./supabase/database.types";

export type Perfil = Database["public"]["Enums"]["perfil_usuario"];

export type UsuarioAtual = {
  id: string;
  nome: string;
  perfil: Perfil;
};

/** Usuário logado e seu perfil. Redireciona para /login se não houver sessão válida. */
export const obterUsuarioAtual = cache(async (): Promise<UsuarioAtual> => {
  const supabase = await criarClienteSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfis")
    .select("id, nome, perfil, ativo")
    .eq("id", auth.user.id)
    .maybeSingle();

  // Usuário sem perfil ativo não acessa nada.
  if (!perfil || !perfil.ativo) {
    await supabase.auth.signOut();
    redirect("/login?erro=sem-perfil");
  }

  return { id: perfil.id, nome: perfil.nome, perfil: perfil.perfil };
});
