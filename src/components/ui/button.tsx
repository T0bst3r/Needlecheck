import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[opacity,transform,background-color,color,box-shadow] duration-150 ease-out disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:not-disabled:scale-[0.96]",
  {
    variants: {
      variant: {
        default: "bg-fg text-bg hover:opacity-90",
        secondary: "bg-surface-2 text-fg shadow-[var(--shadow-border)] hover:bg-surface",
        ghost: "text-fg hover:bg-surface-2",
        outline: "text-fg shadow-[var(--shadow-border)] hover:bg-surface-2",
      },
      size: {
        default: "h-11 rounded-md px-4 text-sm",
        sm: "h-9 rounded-sm px-3 text-sm",
        lg: "h-12 rounded-md px-5 text-base",
        icon: "size-11 rounded-md",
        "icon-sm": "size-9 rounded-sm",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";
