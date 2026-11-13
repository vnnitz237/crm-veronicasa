import Link from "next/link";
import { notFound } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/auth";
import { criarClienteSupabase } from "@/lib/supabase/server";
import { ehUuid } from "@/lib/validacao";
import { NovaNegociacaoForm } from "./form";

export default async function NovaNegociacaoPage({ params }: PageProps<"/clientes/[id]/negociacoes/nova">) {
  const { id } = await params;
  if (!ehUuid(id)) notFound();
  const usuario = await obterUsuarioAtual();
  if (usuario.perfil !== "vendedor") notFound();

  const supabase = await criarClienteSupabase();
  const [{ data: cliente }, { data: servicos }, { data: unidades }] = await Promise.all([
    supabase.from("clientes").select("id, nome").eq("id", id).maybeSingle(),
    supabase.from("servicos").select("id, nome").eq("ativo", true).order("nome"),
    supabase.from("unidades").select("id, nome").eq("ativa", true).order("nome"),
  ]);
  if (!cliente) notFound();

  return (
    <div className="space-y-4">
      <div>
        <Link href={`/clientes/${cliente.id}`} className="link text-sm">← {cliente.nome}</Link>
        <h1 className="mt-1 text-xl font-semibold">Nova negociação</h1>
      </div>
      <NovaNegociacaoForm clienteId={cliente.id} servicos={servicos ?? []} unidades={unidades ?? []} />
    </div>
  );
}
