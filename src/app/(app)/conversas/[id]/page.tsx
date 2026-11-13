import Link from "next/link";
import { notFound } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/auth";
import { criarClienteSupabase } from "@/lib/supabase/server";
import { ehUuid } from "@/lib/validacao";
import { cadeiaDeVersoes, formatarDataHora, ROTULO_CANAL } from "@/lib/conversas";
import { AnaliseForm } from "@/components/conversas/AnaliseForm";

export default async function ConversaPage({ params }: PageProps<"/conversas/[id]">) {
  const { id } = await params;
  if (!ehUuid(id)) notFound();
  const usuario = await obterUsuarioAtual();
  const supabase = await criarClienteSupabase();

  // A RLS devolve vazio para conversas de outro vendedor: tratamos igual a "não existe".
  const { data: conversa } = await supabase.from("vw_conversas").select("*").eq("id", id).maybeSingle();
  if (!conversa) notFound();
  const ehGestor = usuario.perfil === "gestor";
  const ehDono = usuario.perfil === "vendedor" && conversa.vendedor_id === usuario.id;
  if (!ehGestor && !ehDono) notFound();

  const { data: doCliente } = await supabase
    .from("vw_conversas")
    .select("id, substitui_conversa_id, canal, ocorrida_em, conteudo, motivo_correcao, criado_em, versao_atual")
    .eq("cliente_id", conversa.cliente_id);
  const cadeia = cadeiaDeVersoes(doCliente ?? [], conversa.id);
  const numero = cadeia.findIndex((v) => v.id === conversa.id) + 1;
  const atual = cadeia.at(-1);

  const { data: analises } = ehGestor
    ? await supabase
        .from("analises_conversa")
        .select("id, comentario, criado_em, gestora:perfis!analises_conversa_gestora_id_fkey(nome)")
        .eq("conversa_id", conversa.id)
        .order("criado_em")
    : { data: null };

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/clientes/${conversa.cliente_id}`} className="link text-sm">← {conversa.cliente_nome}</Link>
        <h1 className="mt-1 text-xl font-semibold">Conversa · {ROTULO_CANAL[conversa.canal]}</h1>
        <p className="text-sm text-suave">
          {formatarDataHora(conversa.ocorrida_em)} · Vendedor(a): {conversa.vendedor_nome}
          {cadeia.length > 1 && <> · versão {numero} de {cadeia.length}</>}
        </p>
        {!conversa.versao_atual && atual && (
          <p className="mt-2 text-sm" data-testid="aviso-versao-antiga">
            Esta versão foi corrigida. <Link href={`/conversas/${atual.id}`} className="link">Ver a versão atual</Link>
          </p>
        )}
        {ehDono && conversa.versao_atual && (
          <Link href={`/conversas/${conversa.id}/corrigir`} className="botao-secundario mt-2 inline-block py-1 text-sm" data-testid="corrigir-conversa">Corrigir</Link>
        )}
      </div>

      {conversa.motivo_correcao && (
        <p className="text-sm"><span className="text-suave">Motivo da correção:</span> {conversa.motivo_correcao}</p>
      )}
      <div className="cartao whitespace-pre-wrap break-words" data-testid="conversa-conteudo">{conversa.conteudo}</div>

      {cadeia.length > 1 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Versões</h2>
          <ol className="space-y-3" data-testid="conversa-versoes">
            {cadeia.map((v, i) => (
              <li key={v.id} className="cartao space-y-1 text-sm">
                <p className="text-suave">
                  {v.id === conversa.id ? <strong>Versão {i + 1} (esta)</strong> : <Link href={`/conversas/${v.id}`} className="link">Versão {i + 1}</Link>}
                  {" · "}{ROTULO_CANAL[v.canal]} · {formatarDataHora(v.ocorrida_em)} · registrada em {formatarDataHora(v.criado_em)}
                  {v.versao_atual && " · atual"}
                </p>
                {v.motivo_correcao && <p><span className="text-suave">Motivo da correção:</span> {v.motivo_correcao}</p>}
                {v.id !== conversa.id && <p className="whitespace-pre-wrap break-words">{v.conteudo}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}

      {ehGestor && (
        <section className="space-y-3" data-testid="analises">
          <h2 className="font-semibold">Análises da gestão</h2>
          <p className="text-xs text-suave">Visíveis só para a gestão. O vendedor não vê as análises.</p>
          <ul className="space-y-2">
            {(analises ?? []).map((a) => (
              <li key={a.id} className="cartao text-sm">
                <p className="text-suave">{a.gestora?.nome} · {formatarDataHora(a.criado_em)}</p>
                <p className="whitespace-pre-wrap">{a.comentario}</p>
              </li>
            ))}
            {analises?.length === 0 && <li className="text-sm text-suave">Nenhuma análise ainda.</li>}
          </ul>
          <AnaliseForm conversaId={conversa.id} />
        </section>
      )}
    </div>
  );
}
