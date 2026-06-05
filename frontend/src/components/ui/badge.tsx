import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-tight",
  {
    variants: {
      tone: {
        neutral: "bg-secondary text-ink-2",
        teal:    "bg-teal-100 text-teal-800",
        green:   "bg-green-100 text-green-700",
        amber:   "bg-amber-100 text-amber-700",
        red:     "bg-red-100 text-red-700",
        blue:    "bg-blue-100 text-blue-700",
        purple:  "bg-violet-100 text-violet-700",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export { badgeVariants };
