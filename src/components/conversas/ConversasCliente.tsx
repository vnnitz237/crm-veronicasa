import Link from "next/link";
import { criarClienteSupabase } from "@/lib/supabase/server";
import { formatarDataHora, ROTULO_CANAL } from "@/lib/conversas";

/** Versões atuais das conversas do cliente. Para a ficha do cliente. */
export async function ConversasCliente({ clienteId, podeCriar }: { clienteId: string; podeCriar: boolean }) {
  const supabase = await criarClienteSupabase();
  const { data: conversas } = await supabase
    .from("vw_conversas")
    .select("id, canal, ocorrida_em, conteudo, foi_corrigida")
    .eq("cliente_id", clienteId)
    .eq("versao_atual", true)
    .order("ocorrida_em", { ascending: false });

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="font-semibold">Conversas</h2>
        {podeCriar && (
          <Link href={`/clientes/${clienteId}/conversas/nova`} className="botao ml-auto">Registrar conversa</Link>
        )}
      </div>
      <div className="cartao overflow-x-auto p-0">
        <table className="tabela" data-testid="conversas-cliente">
          <thead>
            <tr><th>Quando</th><th>Canal</th><th>Resumo</th></tr>
          </thead>
          <tbody>
            {(conversas ?? []).map((c) => (
              <tr key={c.id}>
                <td className="whitespace-nowrap"><Link href={`/conversas/${c.id}`} className="link">{formatarDataHora(c.ocorrida_em)}</Link></td>
                <td>{ROTULO_CANAL[c.canal]}{c.foi_corrigida && <span className="ml-1 text-xs text-suave">(corrigida)</span>}</td>
                <td className="max-w-md truncate">{c.conteudo}</td>
              </tr>
            ))}
            {conversas?.length === 0 && (
              <tr><td colSpan={3} className="text-center text-suave py-6">Nenhuma conversa registrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
