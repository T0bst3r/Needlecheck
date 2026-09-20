import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums",
  {
    variants: {
      variant: {
        default: "bg-surface-2 text-muted",
        accent: "bg-fg text-bg",
        check: "bg-check/15 text-check",
        warn: "bg-warn/15 text-warn",
        danger: "bg-danger/15 text-danger",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
