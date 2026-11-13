import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";

import { cn } from "../../lib/utils";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cn(
          "h-12 w-full appearance-none rounded-xl border border-trugen-border bg-white px-3.5 pr-9 text-base text-trugen-ink outline-none transition focus:border-trugen-green focus:ring-3 focus:ring-trugen-green/10",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-trugen-muted" />
    </div>
  );
}
