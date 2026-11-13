import Link from "next/link";
import { notFound } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/auth";
import { criarClienteSupabase } from "@/lib/supabase/server";
import { ehUuid } from "@/lib/validacao";
import { formatarData, formatarMoeda, formatarTelefone } from "@/lib/formato";
import { StatusBadge } from "@/components/status";
import { AvisoTelefoneEmRevisao } from "@/components/telefone";
import { ProximasAcoes } from "@/components/acoes/ProximasAcoes";
import { ConversasCliente } from "@/components/conversas/ConversasCliente";

export default async function ClientePage({ params }: PageProps<"/clientes/[id]">) {
  const { id } = await params;
  if (!ehUuid(id)) notFound();
  const usuario = await obterUsuarioAtual();
  const supabase = await criarClienteSupabase();

  // A RLS devolve vazio para registros de outro vendedor: tratamos igual a "não existe".
  const { data: cliente } = await supabase
    .from("clientes")
    .select("id, nome, telefone, telefone_em_revisao, email, origem, observacoes, vendedor_id, vendedor:perfis!clientes_vendedor_id_fkey(nome)")
    .eq("id", id)
    .maybeSingle();
  if (!cliente) notFound();

  const { data: negociacoes } = await supabase
    .from("vw_negociacoes")
    .select("id, servico_nome, unidade_nome, valor, status, data_venda, data_perda, data_execucao_prevista")
    .eq("cliente_id", id)
    .order("criado_em");

  const podeEditar = usuario.perfil === "vendedor" && cliente.vendedor_id === usuario.id;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/clientes" className="link text-sm">← Clientes</Link>
        <h1 className="mt-1 text-xl font-semibold" data-testid="cliente-nome">{cliente.nome}</h1>
        <p className="text-sm text-suave">Responsável: {cliente.vendedor?.nome}</p>
        {podeEditar && (
          <Link href={`/clientes/${cliente.id}/editar`} className="botao-secundario mt-2 inline-block py-1 text-sm" data-testid="editar-cliente">Editar</Link>
        )}
      </div>

      <dl className="cartao grid gap-3 sm:grid-cols-3 text-sm">
        <div><dt className="text-suave">Telefone</dt><dd>{formatarTelefone(cliente.telefone)}{cliente.telefone_em_revisao && <AvisoTelefoneEmRevisao />}</dd></div>
        <div><dt className="text-suave">E-mail</dt><dd>{cliente.email ?? "—"}</dd></div>
        <div><dt className="text-suave">Origem</dt><dd>{cliente.origem ?? "—"}</dd></div>
        {cliente.observacoes && (
          <div className="sm:col-span-3"><dt className="text-suave">Observações</dt><dd className="whitespace-pre-wrap">{cliente.observacoes}</dd></div>
        )}
      </dl>

      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold">Negociações</h2>
          {podeEditar && (
            <Link href={`/clientes/${cliente.id}/negociacoes/nova`} className="botao ml-auto">Nova negociação</Link>
          )}
        </div>
        <p className="text-xs text-suave">Cada negociação é um serviço em uma unidade, com resultado próprio.</p>
        <div className="cartao overflow-x-auto p-0">
          <table className="tabela" data-testid="negociacoes-cliente">
            <thead>
              <tr><th>Serviço</th><th>Unidade</th><th>Valor</th><th>Status</th><th>Data da venda</th><th>Execução prevista</th></tr>
            </thead>
            <tbody>
              {(negociacoes ?? []).map((n) => (
                <tr key={n.id}>
                  <td><Link href={`/negociacoes/${n.id}`} className="link">{n.servico_nome}</Link></td>
                  <td>{n.unidade_nome}</td>
                  <td>{formatarMoeda(n.valor)}</td>
                  <td><StatusBadge status={n.status} /></td>
                  <td>{formatarData(n.data_venda)}</td>
                  <td>{formatarData(n.data_execucao_prevista)}</td>
                </tr>
              ))}
              {negociacoes?.length === 0 && (
                <tr><td colSpan={6} className="text-center text-suave py-6">Nenhuma negociação ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ProximasAcoes clienteId={cliente.id} podeCriar={podeEditar} />
      <ConversasCliente clienteId={cliente.id} podeCriar={podeEditar} />
    </div>
  );
}
