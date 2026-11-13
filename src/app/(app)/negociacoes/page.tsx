import Link from "next/link";
import { obterUsuarioAtual } from "@/lib/auth";
import { criarClienteSupabase } from "@/lib/supabase/server";
import { formatarData, formatarMoeda } from "@/lib/formato";
import { StatusBadge } from "@/components/status";

const FILTROS = [
  ["", "Todas"],
  ["em_negociacao", "Em negociação"],
  ["fechou", "Fechou"],
  ["nao_fechou", "Não fechou"],
] as const;

export default async function NegociacoesPage({ searchParams }: PageProps<"/negociacoes">) {
  const usuario = await obterUsuarioAtual();
  const { status } = await searchParams;
  const filtro = FILTROS.some(([v]) => v && v === status) ? (status as "em_negociacao" | "fechou" | "nao_fechou") : "";

  const supabase = await criarClienteSupabase();
  let consulta = supabase.from("vw_negociacoes").select("*").order("atualizado_em", { ascending: false });
  if (filtro) consulta = consulta.eq("status", filtro);
  const { data: negociacoes, error } = await consulta;
  if (error) throw new Error("Falha ao carregar negociações.");

  const ehGestor = usuario.perfil === "gestor";

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Negociações</h1>
      <nav className="flex flex-wrap gap-2 text-sm">
        {FILTROS.map(([valor, rotulo]) => (
          <Link
            key={valor}
            href={valor ? `/negociacoes?status=${valor}` : "/negociacoes"}
            className={filtro === valor ? "botao py-1" : "botao-secundario py-1"}
          >
            {rotulo}
          </Link>
        ))}
      </nav>
      <div className="cartao overflow-x-auto p-0">
        <table className="tabela" data-testid="lista-negociacoes">
          <thead>
            <tr>
              <th>Cliente</th><th>Serviço</th><th>Unidade</th>
              {ehGestor && <th>Vendedor(a)</th>}
              <th className="text-right">Valor</th><th>Status</th><th>Data da venda</th><th>Execução prevista</th>
            </tr>
          </thead>
          <tbody>
            {negociacoes.map((n) => (
              <tr key={n.id}>
                <td><Link href={`/negociacoes/${n.id}`} className="link">{n.cliente_nome}</Link></td>
                <td>{n.servico_nome}</td>
                <td>{n.unidade_nome}</td>
                {ehGestor && <td>{n.vendedor_nome}</td>}
                <td className="text-right">{formatarMoeda(n.valor ?? 0)}</td>
                <td>{n.status && <StatusBadge status={n.status} />}</td>
                <td>{formatarData(n.data_venda)}</td>
                <td>{formatarData(n.data_execucao_prevista)}</td>
              </tr>
            ))}
            {negociacoes.length === 0 && (
              <tr><td colSpan={8} className="text-center text-suave py-6">Nenhuma negociação.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
