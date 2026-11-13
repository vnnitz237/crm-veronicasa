import type { NextRequest } from "next/server";
import { criarClienteSupabase } from "@/lib/supabase/server";
import { gerarCsv } from "@/lib/csv";
import { ROTULO_STATUS } from "@/lib/formato";
import { lerMes, mesAtual, mesParaTexto } from "@/lib/validacao";

const COLUNAS = [
  "Cliente", "Serviço", "Unidade", "Vendedor(a)", "Resultado",
  "Data da venda/recusa", "Motivo", "Execução prevista", "Valor",
];

export async function GET(request: NextRequest) {
  const supabase = await criarClienteSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new Response("Não autenticado.", { status: 401 });

  const { data: perfil } = await supabase.from("perfis").select("ativo").eq("id", auth.user.id).maybeSingle();
  if (!perfil?.ativo) return new Response("Não autenticado.", { status: 401 });

  const mes = lerMes(request.nextUrl.searchParams.get("mes"), mesAtual());
  // Mesma função (e mesma RLS) do relatório mensal na tela.
  const { data, error } = await supabase.rpc("negociacoes_resultado_mes", { p_ano: mes.ano, p_mes: mes.mes });
  if (error) return new Response("Falha ao gerar o CSV.", { status: 500 });

  const linhas = (data ?? []).map((l) => [
    l.cliente_nome,
    l.servico_nome,
    l.unidade_nome,
    l.vendedor_nome,
    ROTULO_STATUS[l.status],
    l.data_venda ?? l.data_perda,
    l.motivo_perda,
    l.data_execucao_prevista,
    Number(l.valor),
  ]);

  return new Response(gerarCsv(COLUNAS, linhas), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vendas-${mesParaTexto(mes)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
