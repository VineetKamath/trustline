"use client";

import { motion } from "framer-motion";
import { ChevronRight, Info } from "lucide-react";
import { useState } from "react";
import { CountUp } from "@/components/animations";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Badge, Card } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import type { ReputationContext, ReputationMetric } from "@/types";

function MetricValue({ metric }: { metric: ReputationMetric }) {
  if (metric.key === "dispute_rate") {
    return (
      <span
        className={cn(
          "text-[26px] font-semibold tracking-[-0.03em]",
          metric.level === "Low" ? "text-verified" : metric.level === "Moderate" ? "text-caution" : "text-danger",
        )}
      >
        {metric.display}
      </span>
    );
  }
  if (metric.value === null) return <span className="text-[26px] font-semibold text-faint">—</span>;
  return (
    <span
      className={cn(
        "text-[26px] font-semibold tracking-[-0.03em]",
        metric.value >= 90 ? "text-ink" : metric.value >= 70 ? "text-caution" : "text-danger",
      )}
    >
      <CountUp value={metric.value} suffix="%" />
    </span>
  );
}

/** One behavioural metric: value, meter, and a tap target to see the maths. */
export function TrustMetric({ metric, onInspect }: { metric: ReputationMetric; onInspect: () => void }) {
  const pct = metric.key === "dispute_rate" ? 100 - Math.min(100, (metric.value ?? 0) * 5) : metric.value ?? 0;
  return (
    <button
      onClick={onInspect}
      className="group flex w-full flex-col gap-2 rounded-2xl px-1 py-3 text-left transition-colors hover:bg-subtle/60 sm:px-3"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[14px] text-ink-2">{metric.label}</span>
        <MetricValue metric={metric} />
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-subtle">
        <motion.div
          className={cn(
            "h-full rounded-full",
            metric.key === "dispute_rate"
              ? metric.level === "Low"
                ? "bg-verified/80"
                : metric.level === "Moderate"
                  ? "bg-caution"
                  : "bg-danger"
              : (metric.value ?? 0) >= 90
                ? "bg-ink"
                : (metric.value ?? 0) >= 70
                  ? "bg-caution"
                  : "bg-danger",
          )}
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        />
      </div>
      <span className="flex items-center gap-1 text-[12px] text-faint transition-colors group-hover:text-muted">
        {metric.formula}
        <ChevronRight className="size-3.5" />
      </span>
    </button>
  );
}

export function ReputationCard({
  context,
  heading,
  subtitle,
  className,
}: {
  context: ReputationContext;
  heading?: string;
  subtitle: string;
  className?: string;
}) {
  const [inspect, setInspect] = useState<ReputationMetric | null>(null);
  return (
    <Card className={cn("p-5 sm:p-6", className)}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">{heading ?? context.title}</p>
          <p className="mt-1 text-[13px] text-muted">{subtitle}</p>
        </div>
        {context.limitedHistory ? (
          <Badge tone="caution">Limited history · {context.sampleSize}</Badge>
        ) : (
          <Badge tone="verified">From credentials</Badge>
        )}
      </div>
      <div className="divide-y divide-line">
        {context.metrics.map((m) => (
          <div key={m.key} className="py-1">
            <TrustMetric metric={m} onInspect={() => setInspect(m)} />
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2 rounded-2xl bg-subtle/70 p-3">
        {context.totals.map((t) => (
          <div key={t.label} className="min-w-0 text-center">
            <p className="tabular text-[17px] font-semibold text-ink">{t.value}</p>
            <p className="truncate text-[11px] text-muted">{t.label}</p>
          </div>
        ))}
      </div>

      <BottomSheet
        open={inspect !== null}
        onClose={() => setInspect(null)}
        title={inspect?.label}
        description="Calculated from your active credentials — no model, no hidden score."
      >
        {inspect ? (
          <div className="space-y-5">
            <div className="flex items-baseline justify-between rounded-2xl bg-subtle/70 px-4 py-4">
              <span className="text-sm text-muted">Current value</span>
              <span className="text-3xl font-semibold tracking-tight">{inspect.display}</span>
            </div>
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-faint">Formula</p>
              <p className="rounded-xl border border-line px-4 py-3 font-mono text-[13px] text-ink-2">{inspect.formula}</p>
            </div>
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-faint">Inputs</p>
              <div className="divide-y divide-line rounded-xl border border-line">
                {inspect.inputs.map((i) => (
                  <div key={i.label} className="flex items-center justify-between px-4 py-3 text-[14px]">
                    <span className="text-ink-2">{i.label}</span>
                    <span className="tabular font-semibold">{i.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-faint">Sources</p>
              <div className="flex flex-wrap gap-2">
                {inspect.sources.length ? (
                  inspect.sources.map((s) => (
                    <Badge key={s} tone="neutral">
                      {s}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted">No active credentials contribute yet.</span>
                )}
              </div>
            </div>
            <p className="flex gap-2 text-[13px] leading-relaxed text-muted">
              <Info className="mt-0.5 size-4 shrink-0" />
              These numbers are visible only to you. Verifiers can ask you to prove a threshold — like “at least
              90%” — without ever seeing them.
            </p>
          </div>
        ) : null}
      </BottomSheet>
    </Card>
  );
}
