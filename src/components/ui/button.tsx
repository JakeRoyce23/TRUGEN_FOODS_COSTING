import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trugen-green focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-trugen-green text-white shadow-sm hover:bg-trugen-green-dark",
        secondary: "bg-trugen-orange-soft text-trugen-orange-dark hover:bg-trugen-orange-soft/75",
        outline: "border border-trugen-border bg-white text-trugen-ink hover:bg-trugen-cream",
        ghost: "text-trugen-muted hover:bg-trugen-green-soft hover:text-trugen-green",
        danger: "bg-red-50 text-red-700 hover:bg-red-100",
      },
      size: {
        default: "h-11",
        sm: "h-9 min-h-9 rounded-lg px-3 text-xs",
        lg: "h-13 min-h-13 px-5 text-base",
        icon: "h-11 w-11 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return <Component className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
