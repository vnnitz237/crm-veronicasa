import Link from "next/link";
import { notFound } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/auth";
import { criarClienteSupabase } from "@/lib/supabase/server";
import { ehUuid, hojeISO } from "@/lib/validacao";
import { NovaAcaoForm } from "./form";

export default async function NovaAcaoPage({ params }: PageProps<"/clientes/[id]/acoes/nova">) {
  const { id } = await params;
  if (!ehUuid(id)) notFound();
  const usuario = await obterUsuarioAtual();
  if (usuario.perfil !== "vendedor") notFound();

  const supabase = await criarClienteSupabase();
  const [{ data: cliente }, { data: negociacoes }] = await Promise.all([
    supabase.from("clientes").select("id, nome, vendedor_id").eq("id", id).maybeSingle(),
    supabase.from("vw_negociacoes").select("id, servico_nome, unidade_nome").eq("cliente_id", id).order("criado_em"),
  ]);
  // Só o vendedor dono do cliente registra ações dele.
  if (!cliente || cliente.vendedor_id !== usuario.id) notFound();

  return (
    <div className="space-y-4">
      <div>
        <Link href={`/clientes/${cliente.id}`} className="link text-sm">← {cliente.nome}</Link>
        <h1 className="mt-1 text-xl font-semibold">Nova ação</h1>
      </div>
      <NovaAcaoForm
        clienteId={cliente.id}
        hoje={hojeISO()}
        negociacoes={(negociacoes ?? []).map((n) => ({ id: n.id, rotulo: `${n.servico_nome} · ${n.unidade_nome}` }))}
      />
    </div>
  );
}
