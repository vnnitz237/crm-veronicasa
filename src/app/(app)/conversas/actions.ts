"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { obterUsuarioAtual } from "@/lib/auth";
import { criarClienteSupabase } from "@/lib/supabase/server";
import { ehUuid } from "@/lib/validacao";
import { ehCanal, lerDataHoraLocal, type CanalConversa } from "@/lib/conversas";

export type EstadoConversa = { erro?: string; ok?: boolean; valores?: Record<string, string> };

function texto(fd: FormData, campo: string) {
  return String(fd.get(campo) ?? "").trim();
}

function traduzirErro(error: { code?: string; message?: string }, padrao: string): string {
  if (error.code === "23505") return "Esta versão da conversa já foi corrigida. Abra a versão atual para corrigir de novo.";
  if (error.code === "42501") return "Somente o vendedor responsável pelo cliente registra conversas dele.";
  if (error.code === "23514") {
    if (error.message?.includes("negociação")) return "A negociação escolhida não é deste cliente.";
    if (error.message?.includes("correção")) return "A correção deve ser do mesmo cliente e do mesmo vendedor da conversa original.";
    return "Dados da conversa inválidos.";
  }
  if (error.code === "23503") return "Cliente, negociação ou conversa não encontrado.";
  return padrao;
}

function validarCampos(v: Record<string, string>): { erro: string } | { ocorrida_em: string } {
  if (!ehCanal(v.canal)) return { erro: "Escolha o canal." };
  const ocorrida_em = lerDataHoraLocal(v.ocorrida_em);
  if (!ocorrida_em) return { erro: "Informe a data e a hora da conversa." };
  if (!v.conteudo) return { erro: "Escreva o conteúdo da conversa." };
  if (v.conteudo.length > 20000) return { erro: "O conteúdo pode ter até 20.000 caracteres." };
  return { ocorrida_em };
}

export async function registrarConversa(_: EstadoConversa, formData: FormData): Promise<EstadoConversa> {
  const usuario = await obterUsuarioAtual();
  const valores = Object.fromEntries(
    ["cliente_id", "negociacao_id", "canal", "ocorrida_em"].map((c) => [c, texto(formData, c)]),
  );
  // O conteúdo preserva espaços e quebras de linha; só checamos se não está vazio.
  const conteudo = String(formData.get("conteudo") ?? "");
  valores.conteudo = conteudo.trim() ? conteudo : "";
  if (usuario.perfil !== "vendedor") return { erro: "Somente vendedores registram conversas.", valores };
  if (!ehUuid(valores.cliente_id)) return { erro: "Cliente inválido.", valores };
  if (valores.negociacao_id && !ehUuid(valores.negociacao_id)) return { erro: "Negociação inválida.", valores };
  const campos = validarCampos(valores);
  if ("erro" in campos) return { erro: campos.erro, valores };

  const supabase = await criarClienteSupabase();
  const { data, error } = await supabase
    .from("conversas")
    .insert({
      cliente_id: valores.cliente_id,
      negociacao_id: valores.negociacao_id || null,
      vendedor_id: usuario.id,
      canal: valores.canal as CanalConversa,
      ocorrida_em: campos.ocorrida_em,
      conteudo: valores.conteudo,
    })
    .select("id")
    .single();
  if (error) return { erro: traduzirErro(error, "Não foi possível registrar a conversa."), valores };

  revalidatePath(`/clientes/${valores.cliente_id}`);
  revalidatePath("/conversas");
  redirect(`/conversas/${data.id}`);
}

/** Correção = nova versão que aponta para a anterior. A anterior nunca é alterada. */
export async function corrigirConversa(_: EstadoConversa, formData: FormData): Promise<EstadoConversa> {
  const usuario = await obterUsuarioAtual();
  const valores = Object.fromEntries(
    ["substitui_conversa_id", "canal", "ocorrida_em", "motivo_correcao"].map((c) => [c, texto(formData, c)]),
  );
  const conteudo = String(formData.get("conteudo") ?? "");
  valores.conteudo = conteudo.trim() ? conteudo : "";
  if (usuario.perfil !== "vendedor") return { erro: "Somente o vendedor responsável corrige a conversa.", valores };
  if (!ehUuid(valores.substitui_conversa_id)) return { erro: "Conversa não encontrada.", valores };
  const campos = validarCampos(valores);
  if ("erro" in campos) return { erro: campos.erro, valores };
  if (!valores.motivo_correcao) return { erro: "Informe o motivo da correção.", valores };

  const supabase = await criarClienteSupabase();
  const { data: original } = await supabase
    .from("vw_conversas")
    .select("id, cliente_id, negociacao_id, vendedor_id, versao_atual")
    .eq("id", valores.substitui_conversa_id)
    .maybeSingle();
  if (!original || original.vendedor_id !== usuario.id) return { erro: "Conversa não encontrada.", valores };
  if (!original.versao_atual) {
    return { erro: "Esta versão da conversa já foi corrigida. Abra a versão atual para corrigir de novo.", valores };
  }

  const { data, error } = await supabase
    .from("conversas")
    .insert({
      cliente_id: original.cliente_id,
      negociacao_id: original.negociacao_id,
      vendedor_id: usuario.id,
      canal: valores.canal as CanalConversa,
      ocorrida_em: campos.ocorrida_em,
      conteudo: valores.conteudo,
      substitui_conversa_id: original.id,
      motivo_correcao: valores.motivo_correcao,
    })
    .select("id")
    .single();
  if (error) return { erro: traduzirErro(error, "Não foi possível salvar a correção."), valores };

  revalidatePath(`/clientes/${original.cliente_id}`);
  revalidatePath("/conversas");
  revalidatePath(`/conversas/${original.id}`);
  redirect(`/conversas/${data.id}`);
}

export async function registrarAnalise(_: EstadoConversa, formData: FormData): Promise<EstadoConversa> {
  const usuario = await obterUsuarioAtual();
  const valores = { conversa_id: texto(formData, "conversa_id"), comentario: texto(formData, "comentario") };
  if (usuario.perfil !== "gestor") return { erro: "Somente a gestora registra análises.", valores };
  if (!ehUuid(valores.conversa_id)) return { erro: "Conversa não encontrada.", valores };
  if (!valores.comentario) return { erro: "Escreva a análise.", valores };
  if (valores.comentario.length > 5000) return { erro: "A análise pode ter até 5.000 caracteres.", valores };

  const supabase = await criarClienteSupabase();
  const { error } = await supabase
    .from("analises_conversa")
    .insert({ conversa_id: valores.conversa_id, comentario: valores.comentario, gestora_id: usuario.id });
  if (error) {
    if (error.code === "23503") return { erro: "Conversa não encontrada.", valores };
    if (error.code === "42501") return { erro: "Somente a gestora registra análises.", valores };
    return { erro: "Não foi possível registrar a análise.", valores };
  }

  revalidatePath(`/conversas/${valores.conversa_id}`);
  return { ok: true };
}
