import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/auth";

export default async function Inicio() {
  const usuario = await obterUsuarioAtual();
  redirect(usuario.perfil === "gestor" ? "/painel" : "/clientes");
}
