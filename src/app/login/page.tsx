import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { erro } = await searchParams;
  const mensagem = erro === "acesso-desativado" ? "Acesso desativado. Fale com a gestão." : undefined;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm cartao space-y-6">
        <div>
          <h1 className="text-xl font-semibold">CRM Verônica Sá</h1>
          <p className="text-sm text-suave">Ambiente de demonstração · dados fictícios</p>
        </div>
        <LoginForm erroInicial={mensagem} />
      </div>
    </main>
  );
}
