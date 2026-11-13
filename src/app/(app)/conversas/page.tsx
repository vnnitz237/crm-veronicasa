import Link from "next/link";
import { obterUsuarioAtual } from "@/lib/auth";
import { criarClienteSupabase } from "@/lib/supabase/server";
import { ehDataValida, ehUuid } from "@/lib/validacao";
import { CANAIS_CONVERSA, ehCanal, fimDoDia, formatarDataHora, inicioDoDia, ROTULO_CANAL } from "@/lib/conversas";

function param(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

export default async function ConversasPage({ searchParams }: PageProps<"/conversas">) {
  const usuario = await obterUsuarioAtual();
  const sp = await searchParams;
  const ehGestor = usuario.perfil === "gestor";
  const filtro = {
    vendedor: ehGestor && ehUuid(param(sp.vendedor)) ? param(sp.vendedor) : "",
    canal: ehCanal(param(sp.canal)) ? param(sp.canal) : "",
    de: ehDataValida(param(sp.de)) ? param(sp.de) : "",
    ate: ehDataValida(param(sp.ate)) ? param(sp.ate) : "",
  };

  const supabase = await criarClienteSupabase();
  // A RLS limita o vendedor às próprias conversas; a gestora vê todas.
  let consulta = supabase
    .from("vw_conversas")
    .select("id, cliente_id, cliente_nome, vendedor_nome, canal, ocorrida_em, conteudo, foi_corrigida")
    .eq("versao_atual", true)
    .order("ocorrida_em", { ascending: false })
    .limit(500);
  if (filtro.vendedor) consulta = consulta.eq("vendedor_id", filtro.vendedor);
  if (ehCanal(filtro.canal)) consulta = consulta.eq("canal", filtro.canal);
  if (filtro.de) consulta = consulta.gte("ocorrida_em", inicioDoDia(filtro.de));
  if (filtro.ate) consulta = consulta.lte("ocorrida_em", fimDoDia(filtro.ate));

  const [{ data: conversas, error }, { data: vendedores }] = await Promise.all([
    consulta,
    ehGestor
      ? supabase.from("perfis").select("id, nome").eq("perfil", "vendedor").order("nome")
      : Promise.resolve({ data: [] as { id: string; nome: string }[] }),
  ]);
  if (error) throw new Error("Falha ao carregar as conversas.");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Conversas</h1>
        <p className="text-sm text-suave">{ehGestor ? "Todos os vendedores" : "Minhas conversas"} · versões atuais</p>
      </div>

      <form className="cartao flex flex-wrap items-end gap-3 text-sm" data-testid="filtros-conversas">
        {ehGestor && (
          <div>
            <label htmlFor="vendedor" className="rotulo">Vendedor(a)</label>
            <select id="vendedor" name="vendedor" defaultValue={filtro.vendedor} className="campo py-1">
              <option value="">Todos</option>
              {(vendedores ?? []).map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="canal" className="rotulo">Canal</label>
          <select id="canal" name="canal" defaultValue={filtro.canal} className="campo py-1">
            <option value="">Todos</option>
            {CANAIS_CONVERSA.map((c) => <option key={c} value={c}>{ROTULO_CANAL[c]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="de" className="rotulo">De</label>
          <input id="de" name="de" type="date" defaultValue={filtro.de} className="campo py-1" />
        </div>
        <div>
          <label htmlFor="ate" className="rotulo">Até</label>
          <input id="ate" name="ate" type="date" defaultValue={filtro.ate} className="campo py-1" />
        </div>
        <button className="botao-secundario py-1">Filtrar</button>
        <Link href="/conversas" className="link">Limpar</Link>
      </form>

      <div className="cartao overflow-x-auto p-0">
        <table className="tabela" data-testid="lista-conversas">
          <thead>
            <tr>
              <th>Quando</th><th>Cliente</th>
              {ehGestor && <th>Vendedor(a)</th>}
              <th>Canal</th><th>Resumo</th>
            </tr>
          </thead>
          <tbody>
            {(conversas ?? []).map((c) => (
              <tr key={c.id}>
                <td className="whitespace-nowrap"><Link href={`/conversas/${c.id}`} className="link">{formatarDataHora(c.ocorrida_em)}</Link></td>
                <td><Link href={`/clientes/${c.cliente_id}`} className="link">{c.cliente_nome}</Link></td>
                {ehGestor && <td>{c.vendedor_nome}</td>}
                <td>{ROTULO_CANAL[c.canal]}{c.foi_corrigida && <span className="ml-1 text-xs text-suave">(corrigida)</span>}</td>
                <td className="max-w-md truncate">{c.conteudo}</td>
              </tr>
            ))}
            {conversas?.length === 0 && (
              <tr><td colSpan={ehGestor ? 5 : 4} className="text-center text-suave py-6">Nenhuma conversa encontrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
