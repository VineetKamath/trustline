"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowUpRight, Check, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/layout/logo";
import { cn } from "@/lib/cn";
import type { PublicTrustSummary } from "@/lib/services/trust";

/**
 * Web preview of the Trustline browser extension. When the real extension
 * (extension/) is installed it marks <html data-trustline-extension="active">
 * and this in-page preview steps aside.
 */
export function TrustlineOverlay({ trust, role = "Host" }: { trust: PublicTrustSummary; role?: string }) {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (document.documentElement.dataset.trustlineExtension !== "active") setVisible(true);
    }, 900);
    return () => window.clearTimeout(t);
  }, []);

  const verified = trust.status === "VERIFIED";

  return (
    <>
      <AnimatePresence>
        {visible && !open ? (
          <motion.button
            key="shield"
            initial={{ opacity: 0, scale: 0.6, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-[calc(96px+env(safe-area-inset-bottom))] right-4 z-40 flex h-12 items-center gap-2 rounded-full border border-line bg-surface pl-1.5 pr-4 font-sans text-ink shadow-float lg:bottom-8 lg:right-8"
            aria-label="Open Trustline"
          >
            <span className="relative">
              <LogoMark size={36} />
              <span
                className={cn(
                  "absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-white",
                  verified ? "bg-verified" : "bg-[#d99a2b]",
                )}
              />
            </span>
            <span className="text-[13.5px] font-semibold">
              {verified ? `${role} verified` : trust.revokedCredentials > 0 ? "Credential revoked" : "Limited history"}
            </span>
          </motion.button>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {open ? (
          <motion.aside
            key="panel"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="fixed inset-x-3 bottom-[calc(12px+env(safe-area-inset-bottom))] z-50 rounded-[22px] border border-line bg-surface font-sans text-ink shadow-float sm:inset-x-auto sm:right-6 sm:w-[340px] lg:bottom-auto lg:top-24"
            role="dialog"
            aria-label="Trustline"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="flex items-center gap-2">
                <LogoMark size={22} />
                <span className="text-[12px] font-semibold uppercase tracking-[0.16em]">Trustline</span>
              </span>
              <button
                onClick={() => setOpen(false)}
                className="inline-flex size-9 items-center justify-center rounded-full text-muted hover:bg-subtle"
                aria-label="Close Trustline"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="p-5">
              {verified ? (
                <>
                  <p className="flex items-center gap-2 text-[17px] font-semibold">
                    {role} verified <ShieldCheck className="size-5 text-verified" />
                  </p>
                  {trust.hosting ? (
                    <dl className="mt-4 space-y-2.5">
                      <div className="flex items-baseline justify-between">
                        <dt className="text-[14px] text-muted">Completed</dt>
                        <dd className="text-[20px] font-semibold tabular">{trust.hosting.completedBookings}</dd>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <dt className="text-[14px] text-muted">Completion</dt>
                        <dd className="text-[20px] font-semibold tabular">{trust.hosting.completionRate}%</dd>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <dt className="text-[14px] text-muted">Cancelled by them</dt>
                        <dd className="text-[20px] font-semibold tabular">{trust.hosting.cancellations}</dd>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <dt className="text-[14px] text-muted">Disputes</dt>
                        <dd className="text-[16px] font-semibold">{trust.hosting.disputeLevel}</dd>
                      </div>
                    </dl>
                  ) : null}
                  <p className="mt-4 flex items-center gap-2 rounded-xl bg-verified-soft px-3 py-2 text-[13px] font-medium text-verified">
                    <Check className="size-4" strokeWidth={3} /> Credential verified on ledger
                  </p>
                  {trust.issuers.length ? (
                    <p className="mt-2 text-[12.5px] text-muted">Issued by {trust.issuers.join(", ")}.</p>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="flex items-center gap-2 text-[17px] font-semibold">
                    <AlertTriangle className="size-5 text-[#b7791f]" />{" "}
                    {trust.revokedCredentials > 0 ? "Credential revoked by issuer" : "Limited verification"}
                  </p>
                  <dl className="mt-4 space-y-2 text-[14px]">
                    {[
                      ["Identity verification", "Limited"],
                      ["Verified transaction history", "0"],
                      ["Verified credentials", String(trust.verifiedCredentials)],
                      ["Account age", "Not available through Trustline"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-baseline justify-between gap-3">
                        <dt className="text-muted">{k}</dt>
                        <dd className="text-right font-medium">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-4 rounded-xl bg-caution-soft px-3 py-2 text-[12.5px] font-semibold uppercase tracking-[0.08em] text-caution">
                    Limited verified history
                  </p>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                    {trust.revokedCredentials > 0
                      ? `A platform revoked ${trust.revokedCredentials} credential${trust.revokedCredentials > 1 ? "s" : ""} for this account. This is a fact from the ledger, not an accusation.`
                      : "This is not an accusation. No platform has issued verified history for this account yet."}
                  </p>
                </>
              )}
              <Link
                href={`/t/${trust.trustlineId}`}
                className="mt-5 flex h-11 items-center justify-center gap-1.5 rounded-full border border-line text-[14px] font-medium hover:bg-subtle"
              >
                View Trustline <ArrowUpRight className="size-4" />
              </Link>
              <p className="mt-3 text-center text-[11px] text-faint">Browser extension · web preview · {trust.trustlineId}</p>
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </>
  );
}
