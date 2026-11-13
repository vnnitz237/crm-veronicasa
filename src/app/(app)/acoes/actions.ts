"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { obterUsuarioAtual } from "@/lib/auth";
import { criarClienteSupabase } from "@/lib/supabase/server";
import { ehDataValida, ehUuid } from "@/lib/validacao";
import { ehSituacaoAcao, ehTipoAcao, type SituacaoAcao } from "@/lib/acoes";

export type EstadoAcao = { erro?: string; valores?: Record<string, string> };

function texto(fd: FormData, campo: string) {
  return String(fd.get(campo) ?? "").trim();
}

function traduzirErro(error: { code?: string; message?: string }, padrao: string): string {
  if (error.code === "42501") {
    if (error.message?.includes("não podem ser alterados")) return "Cliente, negociação e responsável da ação não podem ser alterados.";
    return "Somente o vendedor responsável pelo cliente registra ou altera ações dele.";
  }
  if (error.code === "23514") {
    if (error.message?.includes("mesmo cliente")) return "A negociação escolhida não é deste cliente.";
    if (error.message?.includes("planejada")) return "Informe a data prevista.";
    if (error.message?.includes("realizada")) return "Informe a data em que a ação foi realizada.";
    if (error.message?.includes("cancelada")) return "Informe o motivo do cancelamento.";
    return "Dados da ação inválidos.";
  }
  if (error.code === "23503") return "Cliente ou negociação não encontrado.";
  return padrao;
}

type Datas = { data_prevista: string | null; data_realizada: string | null; motivo_cancelamento: string | null };

/** Regras por situação, espelhando as restrições do banco. */
function validarSituacao(situacao: SituacaoAcao, v: Record<string, string>): { erro: string } | Datas {
  if (v.data_prevista && !ehDataValida(v.data_prevista)) return { erro: "Data prevista inválida." };
  if (v.data_realizada && !ehDataValida(v.data_realizada)) return { erro: "Data realizada inválida." };
  if (situacao === "planejada" && !v.data_prevista) return { erro: "Informe a data prevista." };
  if (situacao === "realizada" && !v.data_realizada) return { erro: "Informe a data em que a ação foi realizada." };
  if (situacao === "cancelada" && !v.motivo_cancelamento) return { erro: "Informe o motivo do cancelamento." };
  return {
    data_prevista: v.data_prevista || null,
    data_realizada: situacao === "realizada" ? v.data_realizada : null,
    motivo_cancelamento: situacao === "cancelada" ? v.motivo_cancelamento : null,
  };
}

export async function criarAcao(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const usuario = await obterUsuarioAtual();
  const valores = Object.fromEntries(
    ["cliente_id", "negociacao_id", "tipo", "situacao", "data_prevista", "data_realizada", "descricao", "resultado"].map(
      (c) => [c, texto(formData, c)],
    ),
  );
  if (usuario.perfil !== "vendedor") return { erro: "Somente vendedores registram ações.", valores };
  if (!ehUuid(valores.cliente_id)) return { erro: "Cliente inválido.", valores };
  if (valores.negociacao_id && !ehUuid(valores.negociacao_id)) return { erro: "Negociação inválida.", valores };
  if (!ehTipoAcao(valores.tipo)) return { erro: "Escolha o tipo da ação.", valores };
  const situacao = valores.situacao || "planejada";
  if (situacao !== "planejada" && situacao !== "realizada") {
    return { erro: "Uma nova ação é planejada ou realizada.", valores };
  }
  if (!valores.descricao) return { erro: "Descreva a ação.", valores };
  if (valores.descricao.length > 2000) return { erro: "A descrição pode ter até 2000 caracteres.", valores };
  const datas = validarSituacao(situacao, { ...valores, motivo_cancelamento: "" });
  if ("erro" in datas) return { erro: datas.erro, valores };

  const supabase = await criarClienteSupabase();
  const { data, error } = await supabase
    .from("acoes_venda")
    .insert({
      cliente_id: valores.cliente_id,
      negociacao_id: valores.negociacao_id || null,
      vendedor_id: usuario.id,
      tipo: valores.tipo,
      situacao,
      data_prevista: datas.data_prevista,
      data_realizada: datas.data_realizada,
      descricao: valores.descricao,
      resultado: valores.resultado || null,
    })
    .select("id")
    .single();
  if (error) return { erro: traduzirErro(error, "Não foi possível registrar a ação."), valores };

  revalidatePath(`/clientes/${valores.cliente_id}`);
  revalidatePath("/acoes");
  redirect(`/acoes/${data.id}`);
}

export async function atualizarAcao(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const usuario = await obterUsuarioAtual();
  const valores = Object.fromEntries(
    ["id", "situacao", "data_prevista", "data_realizada", "resultado", "motivo_cancelamento"].map((c) => [c, texto(formData, c)]),
  );
  if (usuario.perfil !== "vendedor") return { erro: "Somente o vendedor responsável altera a ação.", valores };
  if (!ehUuid(valores.id)) return { erro: "Ação não encontrada.", valores };
  if (!ehSituacaoAcao(valores.situacao)) return { erro: "Escolha a situação.", valores };
  const datas = validarSituacao(valores.situacao, valores);
  if ("erro" in datas) return { erro: datas.erro, valores };

  const supabase = await criarClienteSupabase();
  const { data, error } = await supabase
    .from("acoes_venda")
    .update({ situacao: valores.situacao, ...datas, resultado: valores.resultado || null })
    .eq("id", valores.id)
    .eq("vendedor_id", usuario.id)
    .select("id, cliente_id");
  if (error) return { erro: traduzirErro(error, "Não foi possível salvar a ação."), valores };
  if (!data || data.length === 0) return { erro: "Ação não encontrada.", valores };

  revalidatePath("/acoes");
  revalidatePath(`/clientes/${data[0].cliente_id}`);
  revalidatePath(`/acoes/${valores.id}`);
  redirect(`/acoes/${valores.id}`);
}
