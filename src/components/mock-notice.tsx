import { Info } from "lucide-react";
import type { ReactNode } from "react";

export function MockNotice({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-trugen-orange/20 bg-trugen-orange-soft/55 px-4 py-3 text-sm leading-5 text-trugen-orange-dark" role="status">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
