import { ChevronLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ListingArt } from "@/components/marketplace/listing-art";
import { TripClient } from "@/components/marketplace/trip-client";
import { optionalUser } from "@/lib/auth/guards";
import { config } from "@/lib/config";
import { inr } from "@/lib/format";
import { ServiceError } from "@/lib/services/errors";
import { getBookingView } from "@/lib/services/marketplace";
import { publicTrustByUserId } from "@/lib/services/trust";
import { getUser } from "@/lib/services/wallet";
import { CATEGORIES } from "@/lib/platforms/categories";
import type { BookingRecord, BookingStatus } from "@/types";

export const metadata = { title: "Booking" };

const STATUS_LABEL: Record<BookingStatus, string> = {
  REQUESTED: "Requested · waiting for the provider",
  DECLINED: "Declined by the provider",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed · awaiting feedback",
  REVIEWED: "Reviewed · credentials issued",
};

export default async function TripPage(props: PageProps<"/marketplace/trips/[bookingId]">) {
  const { bookingId } = await props.params;
  const { s, user } = await optionalUser();
  if (!user) redirect("/login");
  let view;
  try {
    view = await getBookingView(s, user.id, bookingId);
  } catch (e) {
    if (e instanceof ServiceError) notFound();
    throw e;
  }
  const { listing } = view;
  const viewerRole = view.booking.hostUserId === user.id ? "host" : "guest";
  const guestUser = await getUser(s, view.booking.guestUserId);
  // Re-checked against the ledger on every view, so the provider always decides on current facts.
  const guestTrust = await publicTrustByUserId(s, view.booking.guestUserId);
  const cat = CATEGORIES[view.booking.category];
  // Double-blind: the other side's answers never leave the server before you answer.
  const booking: BookingRecord = { ...view.booking };
  if (viewerRole === "host" && booking.guestFeedback && !booking.hostFeedback) {
    booking.guestFeedback = { serviceCompleted: true, listingAccurate: true, hostCancelled: false, submittedAt: booking.guestFeedback.submittedAt };
  }
  if (viewerRole === "guest" && booking.hostFeedback && !booking.guestFeedback) {
    booking.hostFeedback = { guestShowedUp: true, paidAsAgreed: true, guestCancelled: false, submittedAt: booking.hostFeedback.submittedAt };
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/marketplace/trips" className="mb-4 inline-flex h-10 items-center gap-1 text-[14px] font-medium hover:underline">
        <ChevronLeft className="size-4" /> My bookings
      </Link>
      <div className="flex gap-4">
        <div className="size-24 shrink-0 overflow-hidden rounded-2xl sm:size-28">
          <ListingArt palette={listing.palette} category={listing.category} />
        </div>
        <div className="min-w-0">
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.1em] text-[#c2553a]">
            {viewerRole === "host" ? `You are the ${cat.provider.toLowerCase()}` : `You are the ${cat.customer.toLowerCase()}`} · {STATUS_LABEL[booking.status]}
          </p>
          <h1 className="mt-1 text-[22px] font-bold tracking-[-0.02em] sm:text-[26px]">{listing.title}</h1>
          <p className="text-[14.5px] text-[#7a6d66]">
            {viewerRole === "host"
              ? `${cat.customer}: ${guestUser.displayName} (${guestUser.trustlineId})`
              : `${cat.provider}: ${listing.providerName} (${listing.providerLabel})`}{" "}
            · {cat.quantity ? `${booking.quantity} ${booking.quantity > 1 ? cat.unitPlural : cat.unit}` : cat.label} · {booking.checkIn} ·{" "}
            {inr(booking.total)}
          </p>
        </div>
      </div>

      <div className="mt-8 font-sans">
        <TripClient
          key={viewerRole}
          booking={booking}
          hostName={listing.providerName}
          guestName={guestUser.displayName}
          guestTrust={guestTrust}
          viewerRole={viewerRole}
          demoMode={config.demoMode}
        />
        {booking.status === "REVIEWED" ? (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-verified-line bg-verified-soft/60 p-4">
            <span className="inline-flex items-center gap-2 text-[14px] font-medium text-verified">
              <ShieldCheck className="size-5" /> {booking.issuedCredentialIds.length} credentials issued on the ledger
            </span>
            <Link href="/credentials" className="text-[14px] font-medium text-ink underline-offset-2 hover:underline">
              View in Trustline
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
