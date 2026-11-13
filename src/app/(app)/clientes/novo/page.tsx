import { notFound } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/auth";
import { NovoClienteForm } from "./form";

export default async function NovoClientePage() {
  const usuario = await obterUsuarioAtual();
  if (usuario.perfil !== "vendedor") notFound();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Novo cliente</h1>
      <NovoClienteForm />
    </div>
  );
}
