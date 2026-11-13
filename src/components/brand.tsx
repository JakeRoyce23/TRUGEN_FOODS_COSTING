import { Wheat } from "lucide-react";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3" aria-label="TRUGEN FOODS">
      <span className="grid size-11 place-items-center rounded-2xl bg-trugen-green text-white shadow-sm">
        <Wheat className="size-6" strokeWidth={2.2} aria-hidden="true" />
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block text-base font-extrabold tracking-[0.12em] text-trugen-green">TRUGEN</span>
          <span className="mt-1 block text-[0.68rem] font-bold tracking-[0.27em] text-trugen-orange">FOODS</span>
        </span>
      )}
    </div>
  );
}
