"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export interface ProgressStep {
  label: string;
  detail?: React.ReactNode;
}

/** Vertical checklist that ticks through steps as `current` advances. */
export function StepProgress({ steps, current, className }: { steps: ProgressStep[]; current: number; className?: string }) {
  return (
    <ol className={cn("space-y-0", className)}>
      {steps.map((step, i) => {
        const state = i < current ? "done" : i === current ? "active" : "pending";
        return (
          <li key={step.label} className="flex gap-3.5">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "inline-flex size-7 items-center justify-center rounded-full border transition-colors duration-300",
                  state === "done" && "border-verified bg-verified text-white",
                  state === "active" && "border-accent text-accent",
                  state === "pending" && "border-line text-faint",
                )}
              >
                {state === "done" ? (
                  <Check className="size-3.5" strokeWidth={3} />
                ) : state === "active" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <span className="size-1.5 rounded-full bg-current" />
                )}
              </span>
              {i < steps.length - 1 ? (
                <span className="relative my-1 min-h-3 w-px flex-1 bg-line">
                  <motion.span
                    className="absolute inset-x-0 top-0 bg-verified"
                    initial={{ height: 0 }}
                    animate={{ height: i < current ? "100%" : 0 }}
                    transition={{ duration: 0.3 }}
                  />
                </span>
              ) : null}
            </div>
            <div className={cn("min-w-0 flex-1 pb-4 pt-0.5", state === "pending" && "opacity-45")}>
              <p className="text-[14.5px] font-medium text-ink">{step.label}</p>
              <AnimatePresence>
                {step.detail && state === "done" ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="overflow-hidden text-[12.5px] text-muted"
                  >
                    {step.detail}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
