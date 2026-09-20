"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { motion, type HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export const buttonVariants = cva(
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[background-color,border-color,color,box-shadow] duration-200 disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-ink text-white shadow-[0_1px_2px_rgb(0_0_0/0.12)] hover:bg-ink-2",
        accent: "bg-accent text-white shadow-[0_1px_2px_rgb(61_77_214/0.3)] hover:bg-accent-strong",
        secondary: "border border-line bg-surface text-ink shadow-card hover:border-line-strong hover:bg-subtle/60",
        ghost: "text-ink-2 hover:bg-subtle",
        danger: "bg-danger text-white hover:bg-[#9c1f15]",
        "danger-soft": "border border-danger-line bg-danger-soft text-danger hover:bg-[#fae2de]",
        verified: "bg-verified text-white hover:bg-[#0f6640]",
      },
      size: {
        sm: "h-9 px-3.5 text-[13px] [&_svg]:size-4",
        md: "h-11 px-5 text-[15px] [&_svg]:size-[18px]",
        lg: "h-[52px] px-6 text-base [&_svg]:size-5",
        icon: "size-11 [&_svg]:size-5",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends Omit<HTMLMotionProps<"button">, "children">,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  children?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, block, loading, disabled, children, ...props },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" aria-hidden /> : null}
      {children}
    </motion.button>
  );
});
