import Link from "next/link";
import { obterUsuarioAtual } from "@/lib/auth";
import { sair } from "../login/actions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const usuario = await obterUsuarioAtual();
  const ehGestor = usuario.perfil === "gestor";

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-borda bg-superficie">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" className="font-semibold">CRM Verônica Sá</Link>
          <nav className="flex flex-wrap gap-4 text-sm">
            {ehGestor && <Link href="/painel" className="link">Painel</Link>}
            <Link href="/clientes" className="link">Clientes</Link>
            <Link href="/negociacoes" className="link">Negociações</Link>
            <Link href="/acoes" className="link">Ações</Link>
            <Link href="/conversas" className="link">Conversas</Link>
            <Link href="/relatorio" className="link">Vendas</Link>
            <Link href="/relatorio/execucao" className="link">Execução</Link>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span data-testid="usuario-atual">
              {usuario.nome} · <span className="text-suave">{ehGestor ? "Gestora" : "Vendedor(a)"}</span>
            </span>
            <form action={sair}>
              <button type="submit" className="botao-secundario py-1">Sair</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
