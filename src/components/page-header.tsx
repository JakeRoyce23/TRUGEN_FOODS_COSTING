import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 max-w-2xl">
        {eyebrow && <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.18em] text-trugen-orange">{eyebrow}</p>}
        <h1 className="break-words font-display text-3xl font-bold tracking-tight text-trugen-ink sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-xl break-words text-sm leading-6 text-trugen-muted sm:text-base">{description}</p>}
      </div>
      {action}
    </div>
  );
}
