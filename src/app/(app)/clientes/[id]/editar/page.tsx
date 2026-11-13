import Link from "next/link";
import { notFound } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/auth";
import { criarClienteSupabase } from "@/lib/supabase/server";
import { ehUuid } from "@/lib/validacao";
import { formatarTelefone } from "@/lib/formato";
import { EditarClienteForm } from "./form";

export default async function EditarClientePage({ params }: PageProps<"/clientes/[id]/editar">) {
  const { id } = await params;
  if (!ehUuid(id)) notFound();
  const usuario = await obterUsuarioAtual();
  if (usuario.perfil !== "vendedor") notFound();

  const supabase = await criarClienteSupabase();
  const { data: cliente } = await supabase
    .from("clientes")
    .select("id, nome, telefone, email, origem, observacoes, vendedor_id")
    .eq("id", id)
    .maybeSingle();
  // Só o vendedor dono edita; para os demais, a rota não existe.
  if (!cliente || cliente.vendedor_id !== usuario.id) notFound();

  return (
    <div className="space-y-4">
      <div>
        <Link href={`/clientes/${cliente.id}`} className="link text-sm">← {cliente.nome}</Link>
        <h1 className="mt-1 text-xl font-semibold">Editar cliente</h1>
      </div>
      <EditarClienteForm
        cliente={{
          id: cliente.id,
          nome: cliente.nome,
          telefone: formatarTelefone(cliente.telefone),
          email: cliente.email ?? "",
          origem: cliente.origem ?? "",
          observacoes: cliente.observacoes ?? "",
        }}
      />
    </div>
  );
}
