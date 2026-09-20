import { AlertTriangle, ShieldCheck, ShieldX } from "lucide-react";
import { cn } from "@/lib/cn";
import { CATEGORIES, type Category } from "@/lib/platforms/categories";
import type { PublicTrustSummary } from "@/lib/services/trust";

export function TrustBadge({ trust, className }: { trust: PublicTrustSummary; className?: string }) {
  const verified = trust.status === "VERIFIED";
  const revoked = !verified && trust.revokedCredentials > 0;
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 font-sans text-[12.5px] font-medium",
        verified
          ? "border-verified-line bg-verified-soft text-verified"
          : revoked
            ? "border-danger-line bg-danger-soft text-danger"
            : "border-caution-line bg-caution-soft text-caution",
        className,
      )}
    >
      {verified ? <ShieldCheck className="size-3.5" /> : revoked ? <ShieldX className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
      {verified ? "Verified" : revoked ? "Credential revoked" : "Limited verification"}
    </span>
  );
}

/** Inline Trustline block shown by a platform that integrates the public API. */
export function HostTrustPanel({ trust, category = "stays" }: { trust: PublicTrustSummary; category?: Category }) {
  const verified = trust.status === "VERIFIED";
  const cat = CATEGORIES[category];
  const h = trust.hosting;
  return (
    <div className="rounded-2xl border border-line bg-canvas/60 p-4 font-sans" data-trustline-subject={trust.trustlineId} data-trustline-role="provider">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-faint">Trustline</span>
        <TrustBadge trust={trust} />
      </div>
      {verified && h ? (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[
              [h.completedBookings.toLocaleString("en-IN"), cat.providerNoun],
              [`${h.completionRate}%`, "completion"],
              [h.cancellations.toLocaleString("en-IN"), "cancelled by them"],
            ].map(([v, l]) => (
              <div key={l} className="rounded-xl bg-surface px-1 py-2.5 ring-1 ring-line">
                <p className="text-[18px] font-semibold tabular text-ink">{v}</p>
                <p className="text-[11px] leading-tight text-muted">{l}</p>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-[12px]">
            <span
              className={cn(
                "rounded-full px-2.5 py-1 font-medium",
                h.disputeLevel === "Low" ? "bg-verified-soft text-verified" : h.disputeLevel === "Moderate" ? "bg-caution-soft text-caution" : "bg-danger-soft text-danger",
              )}
            >
              Disputes: {h.disputeLevel}
            </span>
            {h.limitedHistory ? (
              <span className="rounded-full bg-caution-soft px-2.5 py-1 font-medium text-caution">
                Limited history · only {h.acceptedBookings} {h.acceptedBookings === 1 ? cat.unit : cat.unitPlural}
              </span>
            ) : null}
          </div>
        </>
      ) : trust.revokedCredentials > 0 ? (
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">
          A platform <span className="font-medium">revoked</span> this {cat.provider.toLowerCase()}&apos;s credential. There is no active
          verified history. <span className="text-muted">A fact, not an accusation — ask the platform for details.</span>
        </p>
      ) : (
        <p className="mt-2 text-[13.5px] text-ink-2">
          Account reputation: <span className="font-medium">Insufficient verified history</span>
        </p>
      )}
    </div>
  );
}
