import { ROTULO_SITUACAO_ACAO, type SituacaoAcao } from "@/lib/acoes";

const COR: Record<SituacaoAcao, string> = {
  planejada: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100",
  realizada: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
  cancelada: "bg-stone-200 text-stone-800 dark:bg-stone-700/60 dark:text-stone-100",
};

export function SituacaoAcaoBadge({ situacao }: { situacao: SituacaoAcao }) {
  return (
    <span data-testid="acao-situacao" className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${COR[situacao]}`}>
      {ROTULO_SITUACAO_ACAO[situacao]}
    </span>
  );
}
