import Link from "next/link";
import { obterUsuarioAtual } from "@/lib/auth";
import { criarClienteSupabase } from "@/lib/supabase/server";
import { formatarTelefone } from "@/lib/formato";
import { chaveTelefone } from "@/lib/validacao";
import { AvisoTelefoneEmRevisao } from "@/components/telefone";

export default async function ClientesPage({ searchParams }: PageProps<"/clientes">) {
  const usuario = await obterUsuarioAtual();
  const { q } = await searchParams;
  const busca = typeof q === "string" ? q.trim() : "";

  const supabase = await criarClienteSupabase();
  let consulta = supabase
    .from("clientes")
    .select("id, nome, telefone, telefone_em_revisao, origem, vendedor:perfis!clientes_vendedor_id_fkey(nome), negociacoes(count)")
    .order("nome");
  if (busca) {
    const digitos = chaveTelefone(busca);
    const termo = busca.replace(/[%_,()]/g, " ");
    consulta = digitos.length >= 4
      ? consulta.or(`nome.ilike.%${termo}%,telefone.ilike.%${digitos}%`)
      : consulta.ilike("nome", `%${termo}%`);
  }
  const { data: clientes, error } = await consulta;
  if (error) throw new Error("Falha ao carregar clientes.");

  const ehGestor = usuario.perfil === "gestor";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">Clientes</h1>
        {!ehGestor && <Link href="/clientes/novo" className="botao ml-auto">Novo cliente</Link>}
      </div>
      <form className="flex gap-2">
        <input name="q" defaultValue={busca} placeholder="Buscar por nome ou telefone" className="campo max-w-sm" />
        <button className="botao-secundario">Buscar</button>
      </form>
      <div className="cartao overflow-x-auto p-0">
        <table className="tabela">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Telefone</th>
              <th>Origem</th>
              {ehGestor && <th>Vendedor(a)</th>}
              <th className="text-right">Negociações</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id}>
                <td><Link href={`/clientes/${c.id}`} className="link">{c.nome}</Link></td>
                <td>{formatarTelefone(c.telefone)}{c.telefone_em_revisao && <AvisoTelefoneEmRevisao />}</td>
                <td>{c.origem ?? "—"}</td>
                {ehGestor && <td>{c.vendedor?.nome}</td>}
                <td className="text-right">{c.negociacoes[0]?.count ?? 0}</td>
              </tr>
            ))}
            {clientes.length === 0 && (
              <tr><td colSpan={5} className="text-center text-suave py-6">Nenhum cliente encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
