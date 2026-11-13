import type { NextRequest } from "next/server";
import { criarClienteSupabase } from "@/lib/supabase/server";
import { gerarCsv } from "@/lib/csv";
import {
  dataDeReferencia,
  pertenceAoMes,
  ROTULO_SITUACAO_EXECUCAO,
  situacaoExecucao,
  type LinhaExecucao,
} from "@/lib/relatorio-execucao";
import { hojeISO, lerMes, mesAtual, mesParaTexto } from "@/lib/validacao";

const COLUNAS = [
  "Cliente", "Serviço", "Unidade", "Vendedor(a)", "Situação da execução",
  "Data da venda", "Execução prevista", "Execução realizada", "Motivo do cancelamento", "Valor",
];

export async function GET(request: NextRequest) {
  const supabase = await criarClienteSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new Response("Não autenticado.", { status: 401 });

  const { data: perfil } = await supabase.from("perfis").select("ativo").eq("id", auth.user.id).maybeSingle();
  if (!perfil?.ativo) return new Response("Não autenticado.", { status: 401 });

  const mes = lerMes(request.nextUrl.searchParams.get("mes"), mesAtual());
  const hoje = hojeISO();
  // Mesma função, filtro e ordenação da tela /relatorio/execucao.
  const { data, error } = await supabase.rpc("negociacoes_execucao_mes", { p_ano: mes.ano, p_mes: mes.mes });
  if (error) return new Response("Falha ao gerar o CSV.", { status: 500 });

  const linhas = (data as LinhaExecucao[])
    .filter((l) => pertenceAoMes(l, mes))
    .sort((a, b) => (dataDeReferencia(a) ?? "").localeCompare(dataDeReferencia(b) ?? ""))
    .map((l) => {
      const s = situacaoExecucao(l, hoje);
      return [
        l.cliente_nome,
        l.servico_nome,
        l.unidade_nome,
        l.vendedor_nome,
        s ? ROTULO_SITUACAO_EXECUCAO[s] : null,
        l.data_venda,
        l.data_execucao_prevista,
        l.data_execucao_realizada,
        l.motivo_cancelamento_execucao,
        Number(l.valor),
      ];
    });

  return new Response(gerarCsv(COLUNAS, linhas), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="execucao-${mesParaTexto(mes)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
