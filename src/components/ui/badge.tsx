import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium tracking-wide uppercase",
  {
    variants: {
      variant: {
        default: "bg-navy/10 text-navy",
        outline: "border border-gray-200 bg-white text-gray-600",
        hot: "bg-red-50 text-red-700",
        warm: "bg-amber-50 text-amber-800",
        cold: "bg-slate-100 text-slate-600",
        champagne: "bg-champagne/30 text-navy",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
