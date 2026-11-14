"use server";

import { redirect } from "next/navigation";
import { criarClienteSupabase } from "@/lib/supabase/server";

export type EstadoLogin = { erro?: string };

const MENSAGEM_ACESSO_DESATIVADO = "Acesso desativado. Fale com a gestão.";

export async function entrar(_: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  if (!email || !senha) return { erro: "Informe e-mail e senha." };

  const supabase = await criarClienteSupabase();
  const { data: auth, error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) return { erro: "E-mail ou senha inválidos." };

  const { data: perfil } = await supabase
    .from("perfis")
    .select("id")
    .eq("id", auth.user.id)
    .eq("ativo", true)
    .maybeSingle();

  if (!perfil) {
    await supabase.auth.signOut();
    return { erro: MENSAGEM_ACESSO_DESATIVADO };
  }

  redirect("/");
}

export async function sair() {
  const supabase = await criarClienteSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}
