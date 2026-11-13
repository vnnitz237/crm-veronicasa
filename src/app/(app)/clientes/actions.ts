"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { obterUsuarioAtual } from "@/lib/auth";
import { criarClienteSupabase } from "@/lib/supabase/server";
import { ehUuid, normalizarTelefone } from "@/lib/validacao";

export type EstadoCliente = { erro?: string; valores?: Record<string, string> };

export async function criarCliente(_: EstadoCliente, formData: FormData): Promise<EstadoCliente> {
  const usuario = await obterUsuarioAtual();
  const valores = Object.fromEntries(
    ["nome", "telefone", "email", "origem", "observacoes"].map((c) => [c, String(formData.get(c) ?? "").trim()]),
  );
  if (usuario.perfil !== "vendedor") return { erro: "Somente vendedores cadastram clientes.", valores };

  if (valores.nome.length < 2) return { erro: "Informe o nome do cliente.", valores };
  const telefone = normalizarTelefone(valores.telefone);
  if (!telefone) return { erro: "Telefone inválido. Use DDD + número.", valores };
  if (valores.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(valores.email)) {
    return { erro: "E-mail inválido.", valores };
  }

  const supabase = await criarClienteSupabase();
  const { data, error } = await supabase
    .from("clientes")
    .insert({
      nome: valores.nome,
      telefone,
      email: valores.email || null,
      origem: valores.origem || null,
      observacoes: valores.observacoes || null,
      vendedor_id: usuario.id,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { erro: "Já existe um cliente com este telefone. Procure o cliente na lista ou fale com a gestão.", valores };
    }
    if (error.code === "23514") return { erro: "Telefone inválido. Use DDD + número.", valores };
    return { erro: "Não foi possível salvar o cliente.", valores };
  }

  revalidatePath("/clientes");
  redirect(`/clientes/${data.id}`);
}

export async function atualizarCliente(_: EstadoCliente, formData: FormData): Promise<EstadoCliente> {
  const usuario = await obterUsuarioAtual();
  const valores = Object.fromEntries(
    ["id", "nome", "telefone", "email", "origem", "observacoes"].map((c) => [c, String(formData.get(c) ?? "").trim()]),
  );
  if (usuario.perfil !== "vendedor") return { erro: "Somente o vendedor responsável edita o cliente.", valores };
  if (!ehUuid(valores.id)) return { erro: "Cliente não encontrado.", valores };

  if (valores.nome.length < 2) return { erro: "Informe o nome do cliente.", valores };
  const telefone = normalizarTelefone(valores.telefone);
  if (!telefone) return { erro: "Telefone inválido. Use DDD + número.", valores };
  if (valores.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(valores.email)) {
    return { erro: "E-mail inválido.", valores };
  }

  const supabase = await criarClienteSupabase();
  // A RLS limita o UPDATE ao dono; o filtro por vendedor_id deixa isso explícito.
  const { data, error } = await supabase
    .from("clientes")
    .update({
      nome: valores.nome,
      telefone,
      email: valores.email || null,
      origem: valores.origem || null,
      observacoes: valores.observacoes || null,
    })
    .eq("id", valores.id)
    .eq("vendedor_id", usuario.id)
    .select("id");

  if (error) {
    if (error.code === "23505") {
      return { erro: "Já existe um cliente com este telefone. Procure o cliente na lista ou fale com a gestão.", valores };
    }
    if (error.code === "23514") return { erro: "Telefone inválido. Use DDD + número.", valores };
    return { erro: "Não foi possível salvar o cliente.", valores };
  }
  if (!data || data.length === 0) return { erro: "Cliente não encontrado.", valores };

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${valores.id}`);
  redirect(`/clientes/${valores.id}`);
}
