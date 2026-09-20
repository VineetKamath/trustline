"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeftRight,
  CalendarCheck2,
  CalendarClock,
  CalendarX2,
  Check,
  Clock3,
  EyeOff,
  FastForward,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatedCheck } from "@/components/animations";
import { LogoMark } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Mono } from "@/components/ui/primitives";
import { StepProgress } from "@/components/verification/step-progress";
import { switchPersona } from "@/components/navigation/demo-switcher";
import { ApiError, api, wait } from "@/lib/client/api";
import { cn } from "@/lib/cn";
import { shortTx } from "@/lib/format";
import { CATEGORIES, type Category } from "@/lib/platforms/categories";
import type { PublicTrustSummary } from "@/lib/services/trust";
import type { BookingRecord } from "@/types";

type Issued = { side: "guest" | "host"; credentialId: string; txId: string; blockNumber: number; trustlineId: string };

function YesNo({
  label,
  value,
  onChange,
  positive,
  disabled,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  /** Which answer is the "good" outcome, for colouring. */
  positive: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-3 py-2">
      <span className="text-[14.5px] text-ink-2">{label}</span>
      <div className="flex rounded-full bg-subtle p-1" role="radiogroup" aria-label={label}>
        {[true, false].map((v) => (
          <button
            key={String(v)}
            role="radio"
            aria-checked={value === v}
            disabled={disabled}
            onClick={() => onChange(v)}
            className={cn(
              "h-9 min-w-[58px] rounded-full px-3 text-[13px] font-semibold transition-all",
              value === v
                ? v === positive
                  ? "bg-surface text-verified shadow-card"
                  : "bg-surface text-danger shadow-card"
                : "text-muted",
            )}
          >
            {v ? "Yes" : "No"}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * What the provider gets to see about the customer before accepting: the
 * customer's *published* claims only, re-checked against the ledger. No name
 * beyond what the marketplace already knows, no history, no raw numbers the
 * customer did not choose to publish.
 */
function GuestTrustPanel({ trust, guestName, category }: { trust: PublicTrustSummary; guestName: string; category: Category }) {
  const cat = CATEGORIES[category];
  const reliability = trust.buyer?.bookingReliability ?? null;
  const tone = reliability === null ? "muted" : reliability >= 90 ? "verified" : reliability >= 70 ? "caution" : "danger";
  return (
    <div className="rounded-2xl border border-line bg-canvas/60 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-faint">
          {guestName}&apos;s Trustline · {trust.trustlineId}
        </span>
        <span
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12.5px] font-medium",
            trust.status === "VERIFIED"
              ? "border-verified-line bg-verified-soft text-verified"
              : "border-caution-line bg-caution-soft text-caution",
          )}
        >
          {trust.status === "VERIFIED" ? <ShieldCheck className="size-3.5" /> : <ShieldAlert className="size-3.5" />}
          {trust.status === "VERIFIED" ? "Verified" : "Limited verification"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-surface px-1 py-2.5 ring-1 ring-line">
          <p
            className={cn(
              "text-[18px] font-semibold tabular",
              tone === "verified" && "text-verified",
              tone === "caution" && "text-caution",
              tone === "danger" && "text-danger",
              tone === "muted" && "text-muted",
            )}
          >
            {reliability === null ? "—" : `${reliability}%`}
          </p>
          <p className="text-[11px] leading-tight text-muted">booking reliability</p>
        </div>
        <div className="rounded-xl bg-surface px-1 py-2.5 ring-1 ring-line">
          <p className="text-[18px] font-semibold tabular text-ink">{trust.verifiedCredentials}</p>
          <p className="text-[11px] leading-tight text-muted">verified credentials</p>
        </div>
        <div className="rounded-xl bg-surface px-1 py-2.5 ring-1 ring-line">
          <p className={cn("text-[18px] font-semibold tabular", trust.revokedCredentials ? "text-danger" : "text-ink")}>
            {trust.revokedCredentials}
          </p>
          <p className="text-[11px] leading-tight text-muted">revoked</p>
        </div>
      </div>

      {trust.issuers.length ? (
        <p className="mt-2.5 text-[12.5px] text-muted">Vouched for by {trust.issuers.join(", ")}.</p>
      ) : null}
      {reliability === null ? (
        <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted">
          This {cat.customer.toLowerCase()} has not published a reliability claim. That is their right — it is not evidence
          of anything. Decide on what is here, or ask them for a proof.
        </p>
      ) : null}
      <p className="mt-2.5 flex items-start gap-1.5 text-[12px] leading-relaxed text-faint">
        <EyeOff className="mt-0.5 size-3.5 shrink-0" />
        You are seeing only what they chose to publish. Their exact counts, their history and the other platforms they
        use stay private.
      </p>
    </div>
  );
}

export function TripClient({
  booking,
  hostName,
  guestName,
  guestTrust,
  viewerRole,
  demoMode,
}: {
  booking: BookingRecord;
  hostName: string;
  guestName: string;
  /** The customer's public Trustline — what the provider decides on. */
  guestTrust: PublicTrustSummary;
  viewerRole: "guest" | "host";
  demoMode: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const gf = booking.guestFeedback;
  const hf = booking.hostFeedback;
  const [guest, setGuest] = useState({
    serviceCompleted: gf?.serviceCompleted ?? true,
    listingAccurate: gf?.listingAccurate ?? true,
    hostCancelled: gf?.hostCancelled ?? false,
  });
  const [host, setHost] = useState({
    guestShowedUp: hf?.guestShowedUp ?? true,
    paidAsAgreed: hf?.paidAsAgreed ?? true,
    guestCancelled: hf?.guestCancelled ?? false,
  });
  const [issued, setIssued] = useState<Issued[] | null>(null);
  const [step, setStep] = useState(-1);

  const cat = CATEGORIES[booking.category];
  const guestDone = Boolean(booking.guestFeedback);
  const hostDone = Boolean(booking.hostFeedback);
  const canGuest = viewerRole === "guest" && !guestDone;
  const canHost = viewerRole === "host" && !hostDone;
  // Once a side has answered, show the recorded answers rather than local state.
  const gView = gf && !canGuest ? gf : guest;
  const hView = hf && !canHost ? hf : host;
  // Double-blind: you cannot see the other side's answers until you have given yours.
  const hideGuest = viewerRole === "host" && guestDone && !hostDone;
  const hideHost = viewerRole === "guest" && hostDone && !guestDone;
  const hidden = (
    <p className="mt-3 rounded-xl bg-subtle/70 px-3 py-3 text-[13px] text-muted">
      Answers stay hidden until you submit yours, so neither side can be influenced.
    </p>
  );

  const switchTo = async (side: "guest" | "host") => {
    setBusy("switch");
    const to = await switchPersona(side === "host" ? "host" : "user", window.location.pathname);
    router.push(to);
    router.refresh();
  };

  const waiting = (side: "guest" | "host") => {
    const name = side === "guest" ? guestName : hostName;
    return (
      <div className="mt-4 space-y-3">
        <p className="inline-flex items-center gap-1.5 text-[13.5px] text-muted">
          <Clock3 className="size-4" /> Waiting for {name} to answer on their own account
        </p>
        {demoMode ? (
          <Button variant="secondary" block onClick={() => switchTo(side)} loading={busy === "switch"}>
            <ArrowLeftRight /> Switch to {name}
          </Button>
        ) : null}
      </div>
    );
  };

  const complete = async () => {
    setBusy("complete");
    setError(null);
    try {
      await api(`/api/marketplace/bookings/${booking.id}/complete`, { body: {} });
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not complete stay");
    } finally {
      setBusy(null);
    }
  };

  const submit = async (side: "guest" | "host") => {
    setBusy(side);
    setError(null);
    try {
      const res = await api<{ issued: Issued[] }>(`/api/marketplace/bookings/${booking.id}/feedback`, {
        body: { side, feedback: side === "guest" ? guest : host },
      });
      if (res.issued.length) {
        setIssued(res.issued);
        for (let i = 0; i <= 4; i++) {
          setStep(i);
          await wait(i === 0 ? 300 : 650);
        }
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not submit feedback");
    } finally {
      setBusy(null);
    }
  };

  const respond = async (decision: "accept" | "decline") => {
    setBusy(decision);
    setError(null);
    try {
      await api(`/api/marketplace/bookings/${booking.id}/respond`, {
        body: { decision, ...(decision === "decline" && reason.trim() ? { reason: reason.trim() } : {}) },
      });
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not answer this request");
    } finally {
      setBusy(null);
    }
  };

  // ── Waiting on the provider ──────────────────────────────────────────────
  if (booking.status === "REQUESTED") {
    if (viewerRole === "host") {
      return (
        <div className="space-y-4">
          <div className="rounded-2xl border border-caution-line bg-caution-soft/40 p-5">
            <p className="flex items-center gap-2 text-[15px] font-semibold">
              <CalendarClock className="size-5 text-caution" /> {guestName} wants to book. Nothing is reserved yet.
            </p>
            <p className="mt-1 text-[14px] leading-relaxed text-muted">
              You decide, not the marketplace. Here is what {guestName} has chosen to publish about how they behave —
              vouched for by other platforms and checked against the ledger just now.
            </p>
          </div>

          <GuestTrustPanel trust={guestTrust} guestName={guestName} category={booking.category} />

          <div className="rounded-2xl border border-line p-5">
            <p className="text-[15px] font-semibold">Your decision</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button block onClick={() => respond("accept")} loading={busy === "accept"} disabled={busy !== null}>
                <Check /> Accept the booking
              </Button>
              <Button variant="secondary" block onClick={() => respond("decline")} loading={busy === "decline"} disabled={busy !== null}>
                <X /> Decline
              </Button>
            </div>
            <label className="mt-3 block text-[13px] font-medium text-ink-2">
              Reason, if you decline <span className="font-normal text-muted">(optional — only {guestName} sees it)</span>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={200}
                placeholder="e.g. not enough verified history for a 3-night stay"
                className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-[14px] outline-none focus:border-accent"
              />
            </label>
            <p className="mt-3 text-[12.5px] leading-relaxed text-faint">
              Declining records nothing against {guestName}. No credential is issued either way — credentials only
              describe transactions that actually happened.
            </p>
            {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-caution-line bg-caution-soft/40 p-5">
          <p className="flex items-center gap-2 text-[15px] font-semibold">
            <Clock3 className="size-5 text-caution" /> Requested — waiting for {hostName} to decide
          </p>
          <p className="mt-1 text-[14px] leading-relaxed text-muted">
            {hostName} is looking at your Trustline now. This is exactly what they can see, and nothing more.
          </p>
          {demoMode ? (
            <Button variant="secondary" className="mt-4" onClick={() => switchTo("host")} loading={busy === "switch"}>
              <ArrowLeftRight /> Switch to {hostName} and decide
            </Button>
          ) : null}
        </div>
        <GuestTrustPanel trust={guestTrust} guestName="Your" category={booking.category} />
        <p className="text-[13px] leading-relaxed text-muted">
          Want them to see more? Publish more claims in{" "}
          <Link href="/settings" className="font-medium text-ink underline-offset-2 hover:underline">
            Trustline settings
          </Link>
          . You choose what is on your public profile — and you can take it down again.
        </p>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>
    );
  }

  // ── The provider said no ─────────────────────────────────────────────────
  if (booking.status === "DECLINED") {
    return (
      <div className="rounded-2xl border border-line bg-canvas/50 p-5">
        <p className="flex items-center gap-2 text-[15px] font-semibold">
          <CalendarX2 className="size-5 text-muted" />
          {viewerRole === "host" ? `You declined ${guestName}'s request` : `${hostName} declined this request`}
        </p>
        {booking.declineReason ? (
          <p className="mt-2 rounded-xl bg-subtle/70 px-3 py-2.5 text-[13.5px] text-ink-2">
            Reason given: {booking.declineReason}
          </p>
        ) : (
          <p className="mt-1 text-[14px] text-muted">No reason was given.</p>
        )}
        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          Nothing was charged and no credential was issued — a request that never became a transaction leaves no mark on
          anyone&apos;s reputation.{" "}
          {viewerRole === "guest" ? "You are free to book elsewhere; this decision is not recorded against you." : null}
        </p>
      </div>
    );
  }

  if (booking.status === "CONFIRMED") {
    return (
      <div className="rounded-2xl border border-line bg-canvas/50 p-5">
        <p className="flex items-center gap-2 text-[15px] font-semibold">
          <CalendarCheck2 className="size-5 text-verified" /> Confirmed by {hostName}
        </p>
        <p className="mt-1 text-[14px] text-muted">
          When it&apos;s done, {guestName} ({cat.customer.toLowerCase()}) and {hostName} ({cat.provider.toLowerCase()}) each record what
          happened from their own account. Those outcomes become Trustline credentials for both.
        </p>
        {demoMode ? (
          <Button variant="secondary" className="mt-4" onClick={complete} loading={busy === "complete"}>
            <FastForward /> Mark as completed (demo fast-forward)
          </Button>
        ) : null}
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-line p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
            {cat.customer} {guestName} → {cat.provider.toLowerCase()} {hostName} {viewerRole === "guest" ? "· you" : ""}
          </p>
          <p className="mt-1 text-[17px] font-semibold">How was {hostName}?</p>
          {hideGuest ? hidden : null}
          <div className={cn("mt-2 divide-y divide-line", hideGuest && "hidden")}>
            <YesNo label={cat.customerAsks.completed} value={gView.serviceCompleted} positive onChange={(v) => setGuest({ ...guest, serviceCompleted: v })} disabled={!canGuest} />
            <YesNo label={cat.customerAsks.accurate} value={gView.listingAccurate} positive onChange={(v) => setGuest({ ...guest, listingAccurate: v })} disabled={!canGuest} />
            <YesNo label={cat.customerAsks.cancelled} value={gView.hostCancelled} positive={false} onChange={(v) => setGuest({ ...guest, hostCancelled: v })} disabled={!canGuest} />
          </div>
          {guestDone ? (
            <p className="mt-3 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-verified">
              <Check className="size-4" strokeWidth={3} /> Submitted
            </p>
          ) : canGuest ? (
            <Button className="mt-4" block onClick={() => submit("guest")} loading={busy === "guest"}>
              Submit feedback
            </Button>
          ) : (
            waiting("guest")
          )}
        </div>

        <div className="rounded-2xl border border-line p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
            {cat.provider} {hostName} → {cat.customer.toLowerCase()} {guestName} {viewerRole === "host" ? "· you" : ""}
          </p>
          <p className="mt-1 text-[17px] font-semibold">How was {guestName}?</p>
          {hideHost ? hidden : null}
          <div className={cn("mt-2 divide-y divide-line", hideHost && "hidden")}>
            <YesNo label={cat.providerAsks.showedUp} value={hView.guestShowedUp} positive onChange={(v) => setHost({ ...host, guestShowedUp: v })} disabled={!canHost} />
            <YesNo label={cat.providerAsks.paid} value={hView.paidAsAgreed} positive onChange={(v) => setHost({ ...host, paidAsAgreed: v })} disabled={!canHost} />
            <YesNo label={cat.providerAsks.cancelled} value={hView.guestCancelled} positive={false} onChange={(v) => setHost({ ...host, guestCancelled: v })} disabled={!canHost} />
          </div>
          {hostDone ? (
            <p className="mt-3 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-verified">
              <Check className="size-4" strokeWidth={3} /> Submitted
            </p>
          ) : canHost ? (
            <Button className="mt-4" block onClick={() => submit("host")} loading={busy === "host"}>
              Submit feedback
            </Button>
          ) : (
            waiting("host")
          )}
        </div>
      </div>

      <p className="flex items-start gap-2 text-[13px] text-muted">
        <X className="mt-0.5 size-3.5 shrink-0" /> No star ratings. Only behavioural outcomes both sides can stand behind.
      </p>
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <AnimatePresence>
        {issued ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-line bg-canvas/60 p-5"
          >
            <div className="mb-4 flex items-center gap-2">
              <LogoMark size={20} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">Trustline</span>
            </div>
            <StepProgress
              current={step}
              steps={[
                { label: "Both sides reported the outcome" },
                {
                  label: "OneCity issued two credentials",
                  detail: `Outcome as ${cat.customer.toLowerCase()} → ${guestName} · outcome as ${cat.provider.toLowerCase()} → ${hostName}`,
                },
                { label: "Commitments generated", detail: "Values sealed; evidence stored encrypted off-chain" },
                {
                  label: "Blockchain confirmed",
                  detail: (
                    <span className="flex flex-col gap-0.5">
                      {issued.map((i) => (
                        <Mono key={i.txId}>
                          {i.trustlineId} · block #{i.blockNumber} · tx {shortTx(i.txId)}
                        </Mono>
                      ))}
                    </span>
                  ),
                },
              ]}
            />
            {step >= 4 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 rounded-xl bg-verified-soft p-3">
                <AnimatedCheck size={34} />
                <p className="text-[14px] font-medium text-verified">New reputation credentials are now in both wallets.</p>
              </motion.div>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
