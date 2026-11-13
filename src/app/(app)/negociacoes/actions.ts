"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { obterUsuarioAtual } from "@/lib/auth";
import { criarClienteSupabase } from "@/lib/supabase/server";
import { ehDataValida, ehUuid, lerValorMonetario } from "@/lib/validacao";
import type { Database } from "@/lib/supabase/database.types";

type AtualizacaoNegociacao = Database["public"]["Tables"]["negociacoes"]["Update"];
export type EstadoForm = { erro?: string; ok?: boolean; valores?: Record<string, string> };

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

export async function criarNegociacao(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const usuario = await obterUsuarioAtual();
  const valores = Object.fromEntries(
    ["cliente_id", "servico_id", "unidade_id", "valor", "data_execucao_prevista"].map((c) => [c, texto(formData, c)]),
  );
  if (usuario.perfil !== "vendedor") return { erro: "Somente vendedores criam negociações.", valores };
  if (!ehUuid(valores.cliente_id)) return { erro: "Cliente inválido.", valores };
  if (!ehUuid(valores.servico_id)) return { erro: "Escolha o serviço.", valores };
  if (!ehUuid(valores.unidade_id)) return { erro: "Escolha a unidade.", valores };
  const valor = lerValorMonetario(valores.valor);
  if (valor === null) return { erro: "Valor inválido. Exemplo: 1.200,00", valores };
  if (valores.data_execucao_prevista && !ehDataValida(valores.data_execucao_prevista)) {
    return { erro: "Data de execução prevista inválida.", valores };
  }

  const supabase = await criarClienteSupabase();
  const { data, error } = await supabase
    .from("negociacoes")
    .insert({
      cliente_id: valores.cliente_id,
      vendedor_id: usuario.id,
      servico_id: valores.servico_id,
      unidade_id: valores.unidade_id,
      valor,
      data_execucao_prevista: valores.data_execucao_prevista || null,
    })
    .select("id")
    .single();

  if (error) return { erro: "Não foi possível criar a negociação.", valores };

  revalidatePath(`/clientes/${valores.cliente_id}`);
  redirect(`/negociacoes/${data.id}`);
}

export async function registrarResultado(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const usuario = await obterUsuarioAtual();
  const valores = Object.fromEntries(
    ["id", "status", "data_venda", "data_execucao_prevista", "data_perda", "motivo_perda"].map((c) => [c, texto(formData, c)]),
  );
  if (usuario.perfil !== "vendedor") return { erro: "Somente o vendedor responsável altera a negociação.", valores };
  if (!ehUuid(valores.id)) return { erro: "Negociação inválida.", valores };

  let mudanca: AtualizacaoNegociacao;
  switch (valores.status) {
    case "fechou": {
      if (!ehDataValida(valores.data_venda)) return { erro: "Informe a data da venda.", valores };
      if (valores.data_execucao_prevista && !ehDataValida(valores.data_execucao_prevista)) {
        return { erro: "Data de execução prevista inválida.", valores };
      }
      if (valores.data_execucao_prevista && valores.data_execucao_prevista < valores.data_venda) {
        return { erro: "A execução prevista não pode ser antes da data da venda.", valores };
      }
      mudanca = {
        status: "fechou",
        data_venda: valores.data_venda,
        data_execucao_prevista: valores.data_execucao_prevista || null,
        data_perda: null,
        motivo_perda: null,
      };
      break;
    }
    case "nao_fechou": {
      if (!ehDataValida(valores.data_perda)) return { erro: "Informe a data em que o cliente recusou.", valores };
      if (!valores.motivo_perda) return { erro: "Informe o motivo de não ter fechado.", valores };
      mudanca = {
        status: "nao_fechou",
        data_perda: valores.data_perda,
        motivo_perda: valores.motivo_perda,
        data_venda: null,
        // Negociação perdida não tem execução (o banco também garante isso).
        data_execucao_prevista: null,
      };
      break;
    }
    case "em_negociacao":
      mudanca = { status: "em_negociacao", data_venda: null, data_perda: null, motivo_perda: null };
      break;
    default:
      return { erro: "Escolha o resultado.", valores };
  }

  const supabase = await criarClienteSupabase();
  const { data, error } = await supabase
    .from("negociacoes")
    .update(mudanca)
    .eq("id", valores.id)
    .select("id, cliente_id");

  if (error) return { erro: "Não foi possível salvar o resultado.", valores };
  // Nenhuma linha atualizada = negociação de outro vendedor (bloqueada pela RLS) ou inexistente.
  if (!data?.length) return { erro: "Negociação não encontrada.", valores };

  revalidatePath(`/negociacoes/${valores.id}`);
  revalidatePath(`/clientes/${data[0].cliente_id}`);
  return { ok: true };
}
