import Link from "next/link";
import { notFound } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/auth";
import { criarClienteSupabase } from "@/lib/supabase/server";
import { ehUuid } from "@/lib/validacao";
import { paraDataHoraLocal } from "@/lib/conversas";
import { ConversaForm } from "@/components/conversas/ConversaForm";

export default async function CorrigirConversaPage({ params }: PageProps<"/conversas/[id]/corrigir">) {
  const { id } = await params;
  if (!ehUuid(id)) notFound();
  const usuario = await obterUsuarioAtual();
  if (usuario.perfil !== "vendedor") notFound();

  const supabase = await criarClienteSupabase();
  const { data: conversa } = await supabase
    .from("vw_conversas")
    .select("id, cliente_nome, vendedor_id, canal, ocorrida_em, conteudo, versao_atual")
    .eq("id", id)
    .maybeSingle();
  // Só o dono corrige, e só a versão atual.
  if (!conversa || conversa.vendedor_id !== usuario.id || !conversa.versao_atual) notFound();

  return (
    <div className="space-y-4">
      <div>
        <Link href={`/conversas/${conversa.id}`} className="link text-sm">← Conversa com {conversa.cliente_nome}</Link>
        <h1 className="mt-1 text-xl font-semibold">Corrigir conversa</h1>
        <p className="text-sm text-suave">A correção cria uma nova versão; a anterior é preservada.</p>
      </div>
      <ConversaForm
        substituiId={conversa.id}
        testId="corrigir-conversa-form"
        inicial={{ canal: conversa.canal, ocorrida_em: paraDataHoraLocal(conversa.ocorrida_em), conteudo: conversa.conteudo, motivo_correcao: "" }}
      />
    </div>
  );
}
