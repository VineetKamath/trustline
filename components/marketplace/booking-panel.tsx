"use client";

import { AlertTriangle, Minus, Plus, ShieldCheck, ShieldX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogoMark } from "@/components/layout/logo";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { ApiError, api } from "@/lib/client/api";
import { cn } from "@/lib/cn";
import { inr } from "@/lib/format";
import { CATEGORIES } from "@/lib/platforms/categories";
import type { PublicTrustSummary } from "@/lib/services/trust";
import type { BookingRecord, Listing } from "@/types";

const FEE = 0.08;
const ACCENT = "bg-[#c2553a] hover:bg-[#a9472f]";

function priceFor(price: number, quantity: number) {
  const subtotal = price * quantity;
  const fee = Math.round(subtotal * FEE);
  return { subtotal, fee, total: subtotal + fee };
}

export interface BookingViewer {
  trustlineId: string;
  name: string;
  bookingReliability: number | null;
  limitedHistory: boolean;
  isProvider: boolean;
}

export function BookingPanel({
  listing,
  providerTrust,
  viewer,
  defaultDate,
}: {
  listing: Listing;
  providerTrust: PublicTrustSummary;
  viewer: BookingViewer | null;
  defaultDate: string;
}) {
  const router = useRouter();
  const cat = CATEGORIES[listing.category];
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(cat.quantity ? 2 : 1);
  const [date, setDate] = useState(defaultDate);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const price = priceFor(listing.price, quantity);
  const h = providerTrust.hosting;
  const verified = providerTrust.status === "VERIFIED";
  const revoked = !verified && providerTrust.revokedCredentials > 0;
  const qtyText = `${quantity} ${quantity > 1 ? cat.unitPlural : cat.unit}`;

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ booking: BookingRecord }>("/api/marketplace/bookings", {
        body: { listingId: listing.id, checkIn: date, quantity },
      });
      router.push(`/marketplace/trips/${res.booking.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Booking failed");
      setBusy(false);
    }
  };

  const action = viewer?.isProvider ? (
    <Link
      href="/marketplace/trips"
      className="flex h-[52px] w-full items-center justify-center rounded-full border border-[#dcd3cc] text-[15px] font-medium hover:bg-[#f6f1ed]"
    >
      Your listing · see bookings
    </Link>
  ) : viewer ? (
    // Not "Reserve": the provider has not agreed to anything yet.
    <Button size="lg" block className={ACCENT} onClick={() => setOpen(true)}>
      Request to book
    </Button>
  ) : (
    <Link
      href="/login"
      className={cn("flex h-[52px] w-full items-center justify-center rounded-full text-[16px] font-medium text-white", ACCENT)}
    >
      Sign in to request
    </Link>
  );

  const reliability = viewer?.bookingReliability ?? null;
  const reliabilityTone =
    reliability === null ? "text-ink" : reliability >= 90 ? "text-verified" : reliability >= 60 ? "text-caution" : "text-danger";

  return (
    <>
      <div className="sticky top-32 hidden rounded-2xl border border-[#ece6e1] p-6 shadow-[0_6px_24px_rgb(0_0_0/0.08)] lg:block">
        <p className="text-[22px]">
          <span className="font-semibold">{inr(listing.price)}</span>{" "}
          <span className="text-[15px] text-[#7a6d66]">/ {cat.unit}</span>
        </p>
        <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-xl border border-[#dcd3cc] text-[13px]">
          <div className="border-r border-[#dcd3cc] p-3">
            <p className="text-[10.5px] font-bold uppercase">Date</p>
            <p>{date}</p>
          </div>
          <div className="p-3">
            <p className="text-[10.5px] font-bold uppercase">{cat.quantity ? cat.unitPlural : "Quantity"}</p>
            <p>{qtyText}</p>
          </div>
        </div>
        <div className="mt-4">{action}</div>
        <div className="mt-4 space-y-2 text-[14.5px]">
          <div className="flex justify-between">
            <span className="text-[#7a6d66]">
              {inr(listing.price)} × {qtyText}
            </span>
            <span>{inr(price.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#7a6d66]">Service fee</span>
            <span>{inr(price.fee)}</span>
          </div>
          <div className="flex justify-between border-t border-[#ece6e1] pt-3 font-semibold">
            <span>Total</span>
            <span>{inr(price.total)}</span>
          </div>
        </div>
      </div>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-[#ece6e1] bg-white lg:hidden">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[16px]">
              <span className="font-semibold">{inr(listing.price)}</span> <span className="text-[#7a6d66]">/ {cat.unit}</span>
            </p>
            <p className="truncate text-[12.5px] text-[#7a6d66]">
              {qtyText} · {inr(price.total)}
            </p>
          </div>
          <div className="w-44 shrink-0">{action}</div>
        </div>
      </div>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={`Request to book · ${listing.title}`}
        description={`${cat.provider}: ${listing.providerName} (${listing.providerLabel})`}
        size="lg"
        footer={
          <div>
            {error ? <p className="mb-2 text-sm text-danger">{error}</p> : null}
            <Button size="lg" block onClick={confirm} loading={busy} className={ACCENT}>
              Send request · {inr(price.total)}
            </Button>
            <p className="mt-2 text-center text-[12.5px] text-muted">
              Nothing is charged or reserved until {listing.providerName} accepts.
            </p>
          </div>
        }
      >
        <div className="space-y-5">
          <div className={cn("grid gap-3", cat.quantity ? "grid-cols-2" : "grid-cols-1")}>
            <label className="block text-[12px] font-semibold uppercase tracking-wide text-muted">
              Date
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1.5 h-12 w-full rounded-xl border border-line px-3 text-[15px] font-normal normal-case tracking-normal text-ink outline-none focus:border-accent"
              />
            </label>
            {cat.quantity ? (
              <div className="text-[12px] font-semibold uppercase tracking-wide text-muted">
                {cat.unitPlural}
                <div className="mt-1.5 flex h-12 items-center justify-between rounded-xl border border-line px-1.5">
                  <button
                    aria-label={`Fewer ${cat.unitPlural}`}
                    onClick={() => setQuantity((n) => Math.max(1, n - 1))}
                    className="inline-flex size-9 items-center justify-center rounded-lg text-ink hover:bg-subtle"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="text-[15px] font-semibold normal-case tracking-normal text-ink tabular">{quantity}</span>
                  <button
                    aria-label={`More ${cat.unitPlural}`}
                    onClick={() => setQuantity((n) => Math.min(14, n + 1))}
                    className="inline-flex size-9 items-center justify-center rounded-lg text-ink hover:bg-subtle"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-2xl border border-line">
            <div className="flex items-center gap-2 border-b border-line bg-canvas px-4 py-2.5">
              <LogoMark size={18} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">Trustline</span>
            </div>
            <div className="grid divide-y divide-line sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <div className="p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">
                  {cat.provider} · {listing.providerName}
                </p>
                {verified && h ? (
                  <>
                    <p className="mt-1 flex items-center gap-1.5 text-[14px] font-medium text-verified">
                      <ShieldCheck className="size-4" /> Verified history
                    </p>
                    <ul className="mt-2 space-y-1 text-[14px] text-ink-2">
                      <li>
                        <span className="font-semibold tabular text-ink">{h.completedBookings.toLocaleString("en-IN")}</span> {cat.providerNoun}
                      </li>
                      <li>
                        <span className="font-semibold tabular text-ink">{h.completionRate}%</span> completion
                      </li>
                      <li>
                        <span className="font-semibold tabular text-ink">{h.cancellations}</span> cancelled by them · disputes {h.disputeLevel}
                      </li>
                    </ul>
                    {h.limitedHistory ? <p className="mt-2 text-[12.5px] text-caution">Only {h.acceptedBookings} so far — limited history.</p> : null}
                  </>
                ) : revoked ? (
                  <>
                    <p className="mt-1 flex items-center gap-1.5 text-[14px] font-medium text-danger">
                      <ShieldX className="size-4" /> Credential revoked by issuer
                    </p>
                    <p className="mt-2 text-[13px] text-muted">No active verified history.</p>
                  </>
                ) : (
                  <>
                    <p className="mt-1 flex items-center gap-1.5 text-[14px] font-medium text-caution">
                      <AlertTriangle className="size-4" /> Limited verified history
                    </p>
                    <p className="mt-2 text-[13px] text-muted">No verified credentials yet. Not an accusation — just no evidence either way.</p>
                  </>
                )}
              </div>
              <div className="p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">
                  You ({cat.customer.toLowerCase()}) · your Trustline
                </p>
                {viewer && reliability !== null ? (
                  <>
                    <p className={cn("mt-1 text-[28px] font-semibold tracking-tight tabular", reliabilityTone)}>{reliability}%</p>
                    <p className="text-[13px] text-muted">booking reliability</p>
                    {viewer.limitedHistory ? <p className="mt-1 text-[12.5px] text-caution">Limited history so far.</p> : null}
                  </>
                ) : (
                  <p className="mt-1 text-[14px] text-muted">No verified customer history yet.</p>
                )}
                <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                  {listing.providerName} sees this — and only this — when deciding whether to accept. Your exact counts,
                  your history and the other platforms you use stay private.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-[14.5px]">
            <div className="flex justify-between">
              <span className="text-muted">
                {inr(listing.price)} × {qtyText}
              </span>
              <span>{inr(price.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Service fee</span>
              <span>{inr(price.fee)}</span>
            </div>
            <div className="flex justify-between border-t border-line pt-3 font-semibold">
              <span>Total (demo — no payment taken)</span>
              <span>{inr(price.total)}</span>
            </div>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
