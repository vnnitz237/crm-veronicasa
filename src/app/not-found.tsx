import Link from "next/link";

// Mesma mensagem para "não existe" e "sem permissão": não revela registros de outros vendedores.
export default function NaoEncontrado() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center space-y-4">
      <h1 className="text-xl font-semibold">Registro não encontrado</h1>
      <p className="text-suave">O registro não existe ou você não tem acesso a ele.</p>
      <Link href="/" className="link">Voltar ao início</Link>
    </main>
  );
}
