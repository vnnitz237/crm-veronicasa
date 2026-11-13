/** Marca clientes cujo telefone ficou em conflito na normalização e aguarda revisão da gestão. */
export function AvisoTelefoneEmRevisao() {
  return (
    <span
      title="Telefone em conflito com outro cadastro ou em formato inválido. Aguarda revisão da gestão."
      className="ml-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
    >
      Telefone em revisão
    </span>
  );
}
