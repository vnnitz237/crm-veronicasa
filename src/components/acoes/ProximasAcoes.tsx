import Link from "next/link";
import { criarClienteSupabase } from "@/lib/supabase/server";
import { hojeISO } from "@/lib/validacao";
import { formatarData } from "@/lib/formato";
import { ROTULO_TIPO_ACAO } from "@/lib/acoes";

/** Próximas ações planejadas (de hoje em diante) do cliente. Para a ficha do cliente. */
export async function ProximasAcoes({ clienteId, podeCriar }: { clienteId: string; podeCriar: boolean }) {
  const supabase = await criarClienteSupabase();
  const { data: acoes } = await supabase
    .from("vw_acoes")
    .select("id, tipo, data_prevista, descricao, negociacao_rotulo")
    .eq("cliente_id", clienteId)
    .eq("situacao", "planejada")
    .gte("data_prevista", hojeISO())
    .order("data_prevista")
    .order("criado_em");

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="font-semibold">Próximas ações</h2>
        {podeCriar && (
          <Link href={`/clientes/${clienteId}/acoes/nova`} className="botao ml-auto">Nova ação</Link>
        )}
      </div>
      <div className="cartao overflow-x-auto p-0">
        <table className="tabela" data-testid="proximas-acoes">
          <thead>
            <tr><th>Data prevista</th><th>Tipo</th><th>Descrição</th><th>Negociação</th></tr>
          </thead>
          <tbody>
            {(acoes ?? []).map((a) => (
              <tr key={a.id}>
                <td><Link href={`/acoes/${a.id}`} className="link">{formatarData(a.data_prevista)}</Link></td>
                <td>{ROTULO_TIPO_ACAO[a.tipo]}</td>
                <td className="max-w-md truncate">{a.descricao}</td>
                <td>{a.negociacao_rotulo ?? "—"}</td>
              </tr>
            ))}
            {acoes?.length === 0 && (
              <tr><td colSpan={4} className="text-center text-suave py-6">Nenhuma ação planejada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
