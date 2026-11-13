import type { InputHTMLAttributes } from "react";

import { cn } from "../../lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-xl border border-trugen-border bg-white px-3.5 text-base text-trugen-ink outline-none transition placeholder:text-trugen-muted/65 focus:border-trugen-green focus:ring-3 focus:ring-trugen-green/10 disabled:bg-stone-100 disabled:text-trugen-muted",
        className,
      )}
      {...props}
    />
  );
}
