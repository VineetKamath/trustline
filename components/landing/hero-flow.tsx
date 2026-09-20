"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Building2, Check, FileBadge2, KeyRound, ScanSearch } from "lucide-react";
import { LogoMark } from "@/components/layout/logo";
import { cn } from "@/lib/cn";

const NODES = [
  { key: "issuer", label: "Issuer", sub: "Marketplace A", icon: Building2 },
  { key: "credential", label: "Credential", sub: "Signed · committed", icon: FileBadge2 },
  { key: "trustline", label: "Trustline", sub: "Held by you", icon: null },
  { key: "proof", label: "Private proof", sub: "Zero-knowledge", icon: KeyRound },
  { key: "verifier", label: "Verifier", sub: "Marketplace B", icon: ScanSearch },
] as const;

const PRIVATE = ["Vineet", "+91 98•••", "47 transactions", "Order history", "Addresses"];

const CYCLE = 7;

/**
 * Signature hero animation: a credential travels from issuer to verifier,
 * and every piece of private information stays behind.
 */
export function HeroFlow() {
  const reduce = useReducedMotion();
  const loop = reduce ? {} : { repeat: Infinity, repeatDelay: 0.6 };

  return (
    <div className="relative mx-auto w-full max-w-[560px] rounded-[28px] border border-line bg-surface p-5 shadow-lift sm:p-7">
      <div className="mb-5 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-faint">Live verification</span>
        <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted">
          <span className="size-1.5 rounded-full bg-verified" /> Cedar · ledger · ZK
        </span>
      </div>

      <div className="relative">
        {/* connector */}
        <div className="absolute bottom-6 left-[27px] top-6 w-px bg-line sm:hidden" />
        <div className="absolute left-6 right-6 top-[27px] hidden h-px bg-line sm:block" />
        <motion.div
          className="absolute left-[23px] size-[9px] rounded-full bg-accent shadow-[0_0_0_4px_rgb(61_77_214/0.15)] sm:hidden"
          initial={{ top: "6%" }}
          animate={{ top: ["6%", "88%", "88%"] }}
          transition={{ duration: CYCLE, times: [0, 0.7, 1], ease: "easeInOut", ...loop }}
        />
        <motion.div
          className="absolute top-[23px] hidden size-[9px] rounded-full bg-accent shadow-[0_0_0_4px_rgb(61_77_214/0.15)] sm:block"
          initial={{ left: "4%" }}
          animate={{ left: ["4%", "94%", "94%"] }}
          transition={{ duration: CYCLE, times: [0, 0.7, 1], ease: "easeInOut", ...loop }}
        />

        <ol className="relative flex flex-col gap-4 sm:flex-row sm:justify-between sm:gap-2">
          {NODES.map((node, i) => (
            <li key={node.key} className="flex items-center gap-4 sm:w-[20%] sm:flex-col sm:gap-2 sm:text-center">
              <motion.span
                className={cn(
                  "relative inline-flex size-[54px] shrink-0 items-center justify-center rounded-2xl border bg-surface",
                  node.key === "trustline" ? "border-ink" : "border-line",
                )}
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 0.5, delay: (i / 4) * CYCLE * 0.7, ...(reduce ? {} : { repeat: Infinity, repeatDelay: CYCLE + 0.1 }) }}
              >
                {node.icon ? <node.icon className="size-5 text-ink-2" /> : <LogoMark size={30} />}
              </motion.span>
              <span>
                <span className="block text-[13.5px] font-semibold text-ink">{node.label}</span>
                <span className="block text-[11.5px] text-muted">{node.sub}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-6 rounded-2xl bg-subtle/70 p-4">
        <p className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-faint">Private — stays behind</p>
        <div className="flex flex-wrap gap-1.5">
          {PRIVATE.map((p, i) => (
            <motion.span
              key={p}
              className="rounded-lg border border-line bg-surface px-2.5 py-1 font-mono text-[12px] text-ink-2"
              animate={{ opacity: [1, 1, 0.25, 0.25, 1], filter: ["blur(0px)", "blur(0px)", "blur(3px)", "blur(3px)", "blur(0px)"] }}
              transition={{ duration: CYCLE + 0.6, times: [0, 0.3 + i * 0.05, 0.45 + i * 0.05, 0.95, 1], ...(reduce ? {} : { repeat: Infinity }) }}
            >
              {p}
            </motion.span>
          ))}
        </div>
      </div>

      <motion.div
        className="mt-3 flex items-center justify-between rounded-2xl border border-verified-line bg-verified-soft px-4 py-3"
        animate={{ opacity: [0, 0, 1, 1, 0] }}
        transition={{ duration: CYCLE + 0.6, times: [0, 0.68, 0.74, 0.95, 1], ...(reduce ? {} : { repeat: Infinity }) }}
      >
        <span className="text-[13px] text-ink-2">Verifier receives</span>
        <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-verified">
          <Check className="size-4" strokeWidth={3} /> 20+ successful transactions
        </span>
      </motion.div>
    </div>
  );
}
