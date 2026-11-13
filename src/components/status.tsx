import { COR_STATUS, ROTULO_STATUS } from "@/lib/formato";
import type { Database } from "@/lib/supabase/database.types";

export function StatusBadge({ status }: { status: Database["public"]["Enums"]["status_negociacao"] }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${COR_STATUS[status]}`}>
      {ROTULO_STATUS[status]}
    </span>
  );
}
