import "server-only";
import { CATEGORIES } from "@/lib/platforms/categories";
import { SERVICE_FEE_RATE, demoMarketplaceAdapter } from "@/lib/platforms/demoMarketplaceAdapter";
import type { BookingRecord, GuestFeedback, HostFeedback, TrustSnapshot } from "@/types";
import { recordActivity } from "./activity";
import type { Services } from "./context";
import { issueCredentialInternal } from "./credentials";
import { ServiceError, badRequest, forbidden, notFound } from "./errors";
import { getOrg } from "./organizations";
import { byNewest, newId, nowIso } from "./util";
import { publicTrustByUserId } from "./trust";
import { getUser } from "./wallet";

const PLATFORM = demoMarketplaceAdapter;

export function quote(price: number, quantity: number) {
  const subtotal = price * quantity;
  const fee = Math.round(subtotal * SERVICE_FEE_RATE);
  return { subtotal, fee, total: subtotal + fee };
}

function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** What the provider is allowed to see about the customer before deciding. */
export async function guestTrustSnapshot(s: Services, guestUserId: string, at = nowIso()): Promise<TrustSnapshot> {
  const t = await publicTrustByUserId(s, guestUserId);
  return {
    status: t.status,
    verifiedCredentials: t.verifiedCredentials,
    revokedCredentials: t.revokedCredentials,
    bookingReliability: t.buyer?.bookingReliability ?? null,
    issuers: t.issuers,
    takenAt: at,
  };
}

/**
 * Sends a booking *request*. Nothing is confirmed until the provider accepts:
 * they get the customer's published Trustline and decide for themselves.
 */
export async function createBooking(s: Services, userId: string, input: { listingId: string; checkIn: string; quantity: number }) {
  const listing = PLATFORM.getListing(input.listingId);
  if (!listing) throw notFound("Listing");
  const guest = await getUser(s, userId);
  if (listing.providerUserId === guest.id) throw badRequest("You can't book your own listing");
  const org = await getOrg(s, PLATFORM.platformId);
  const cat = CATEGORIES[listing.category];
  const quantity = cat.quantity ? input.quantity : 1;
  const qtyText = cat.quantity ? `${quantity} ${quantity > 1 ? cat.unitPlural : cat.unit}` : cat.label;
  const at = nowIso();

  const booking: BookingRecord = {
    id: newId("bkg"),
    listingId: listing.id,
    guestUserId: guest.id,
    hostUserId: listing.providerUserId,
    category: listing.category,
    checkIn: input.checkIn,
    checkOut: addDays(input.checkIn, quantity),
    quantity,
    total: quote(listing.price, quantity).total,
    status: "REQUESTED",
    guestTrust: await guestTrustSnapshot(s, guest.id, at),
    issuedCredentialIds: [],
    createdAt: at,
  };
  await s.store.put("bookings", booking);
  await recordActivity(s, {
    ownerId: guest.id,
    kind: "booking_requested",
    actor: org.name,
    title: `Booking requested · ${listing.title}`,
    detail: `${listing.providerName} will decide · ${qtyText}`,
    ref: { type: "booking", id: booking.id },
  });
  await recordActivity(s, {
    ownerId: listing.providerUserId,
    kind: "booking_requested",
    actor: org.name,
    title: `Request to review · ${listing.title}`,
    detail: `${cat.customer} ${guest.displayName} (${guest.trustlineId}) · ${qtyText} · check their Trustline before accepting`,
    ref: { type: "booking", id: booking.id },
  });
  return booking;
}

/**
 * The provider's decision. Only they can make it, only once, and only while
 * the request is outstanding. Declining is a normal, recorded outcome — it
 * costs the customer nothing but the booking, and issues no credential,
 * because nothing happened.
 */
export async function respondToBooking(
  s: Services,
  userId: string,
  bookingId: string,
  input: { decision: "accept" | "decline"; reason?: string },
) {
  const booking = await bookingFor(s, userId, bookingId);
  if (booking.hostUserId !== userId) throw forbidden("Only the provider can answer a booking request");
  if (booking.status !== "REQUESTED") throw new ServiceError(409, "NOT_REQUESTED", "This request has already been answered");

  const listing = PLATFORM.getListing(booking.listingId)!;
  const cat = CATEGORIES[booking.category];
  const org = await getOrg(s, PLATFORM.platformId);
  const guest = await getUser(s, booking.guestUserId);
  const at = nowIso();
  const accepted = input.decision === "accept";

  const updated: BookingRecord = {
    ...booking,
    status: accepted ? "CONFIRMED" : "DECLINED",
    // Re-read the trust at the moment of the decision, so the record shows what
    // was actually in front of the provider rather than what it was at request.
    guestTrust: await guestTrustSnapshot(s, booking.guestUserId, at),
    declineReason: accepted ? undefined : input.reason?.trim() || undefined,
    respondedAt: at,
  };
  await s.store.put("bookings", updated);

  const reliability = updated.guestTrust?.bookingReliability;
  const basis =
    reliability !== null && reliability !== undefined
      ? `Their published booking reliability: ${reliability}%`
      : `They publish no reliability claim — decided on ${updated.guestTrust?.verifiedCredentials ?? 0} verified credentials`;

  await recordActivity(s, {
    ownerId: guest.id,
    kind: accepted ? "booking_confirmed" : "booking_declined",
    actor: org.name,
    title: `${accepted ? "Booking confirmed" : "Booking declined"} · ${listing.title}`,
    detail: accepted
      ? `${listing.providerName} accepted your request`
      : updated.declineReason
        ? `${listing.providerName} declined: ${updated.declineReason}`
        : `${listing.providerName} declined the request`,
    ref: { type: "booking", id: booking.id },
    at,
  });
  await recordActivity(s, {
    ownerId: booking.hostUserId,
    kind: accepted ? "booking_confirmed" : "booking_declined",
    actor: org.name,
    title: `${accepted ? "You accepted" : "You declined"} · ${listing.title}`,
    detail: `${cat.customer} ${guest.displayName} (${guest.trustlineId}) · ${basis}`,
    ref: { type: "booking", id: booking.id },
    at,
  });
  return updated;
}

async function bookingFor(s: Services, userId: string, bookingId: string) {
  const booking = await s.store.get("bookings", bookingId);
  if (!booking) throw notFound("Booking");
  if (booking.guestUserId !== userId && booking.hostUserId !== userId) throw forbidden();
  return booking;
}

export async function getBookingView(s: Services, userId: string, bookingId: string) {
  const booking = await bookingFor(s, userId, bookingId);
  const listing = PLATFORM.getListing(booking.listingId)!;
  return { booking, listing };
}

export async function listGuestBookings(s: Services, userId: string) {
  const bookings = await s.store.query("bookings", "guestUserId", userId);
  return bookings.sort(byNewest).map((booking) => ({ booking, listing: PLATFORM.getListing(booking.listingId)! }));
}

export async function listHostBookings(s: Services, userId: string) {
  const bookings = await s.store.query("bookings", "hostUserId", userId);
  return bookings.sort(byNewest).map((booking) => ({ booking, listing: PLATFORM.getListing(booking.listingId)! }));
}

/** Marks the service as completed. In the demo this is a fast-forward. */
export async function completeBooking(s: Services, userId: string, bookingId: string) {
  const booking = await bookingFor(s, userId, bookingId);
  if (booking.status === "REQUESTED") throw badRequest("The provider has not accepted this request yet");
  if (booking.status === "DECLINED") throw badRequest("The provider declined this request");
  if (booking.status !== "CONFIRMED") throw new ServiceError(409, "NOT_CONFIRMED", "This booking is already complete");
  const listing = PLATFORM.getListing(booking.listingId)!;
  const updated: BookingRecord = { ...booking, status: "COMPLETED", completedAt: nowIso() };
  await s.store.put("bookings", updated);
  await recordActivity(s, {
    ownerId: booking.guestUserId,
    kind: "booking_completed",
    actor: "OneCity",
    title: `Completed · ${listing.title}`,
    detail: "Both sides can now record what happened.",
    ref: { type: "booking", id: booking.id },
  });
  await recordActivity(s, {
    ownerId: booking.hostUserId,
    kind: "booking_completed",
    actor: "OneCity",
    title: `Completed · ${listing.title}`,
    detail: `Record how the ${CATEGORIES[listing.category].customer.toLowerCase()} behaved.`,
    ref: { type: "booking", id: booking.id },
  });
  return updated;
}

/**
 * Two-sided behavioural feedback. Once both sides have reported, CityStay
 * issues an outcome credential to each party and records it on the ledger.
 * The raw feedback is stored as sealed off-chain evidence.
 */
export async function submitFeedback(
  s: Services,
  userId: string,
  bookingId: string,
  input:
    | { side: "guest"; feedback: Omit<GuestFeedback, "submittedAt"> }
    | { side: "host"; feedback: Omit<HostFeedback, "submittedAt"> },
) {
  const booking = await bookingFor(s, userId, bookingId);
  if (booking.status === "REQUESTED" || booking.status === "DECLINED" || booking.status === "CONFIRMED") {
    throw badRequest("Feedback opens once the booking is complete");
  }
  if (booking.status === "REVIEWED") throw new ServiceError(409, "ALREADY_REVIEWED", "Feedback is already complete");

  const updated: BookingRecord = { ...booking };
  if (input.side === "guest") {
    if (booking.guestUserId !== userId) throw forbidden("Only the guest can review the host");
    if (booking.guestFeedback) throw new ServiceError(409, "DUPLICATE", "You already submitted feedback");
    updated.guestFeedback = { ...input.feedback, submittedAt: nowIso() };
  } else {
    if (booking.hostUserId !== userId) throw forbidden("Only the host can review the guest");
    if (booking.hostFeedback) throw new ServiceError(409, "DUPLICATE", "Host feedback already submitted");
    updated.hostFeedback = { ...input.feedback, submittedAt: nowIso() };
  }

  const listing = PLATFORM.getListing(booking.listingId)!;
  const issued: { side: "guest" | "host"; credentialId: string; txId: string; blockNumber: number; trustlineId: string }[] = [];

  if (updated.guestFeedback && updated.hostFeedback) {
    const org = await getOrg(s, PLATFORM.platformId);
    const guest = await getUser(s, booking.guestUserId);
    const host = await getUser(s, booking.hostUserId);
    const g = updated.guestFeedback;
    const h = updated.hostFeedback;
    const evidence = { bookingId: booking.id, listingId: listing.id, guestFeedback: g, hostFeedback: h };

    const guestSuccessful = h.guestShowedUp && h.paidAsAgreed && !h.guestCancelled;
    const guestCred = await issueCredentialInternal(s, {
      org,
      holder: guest,
      credentialType: "CUSTOMER_OUTCOME",
      category: listing.category,
      values: {
        successful_transactions: guestSuccessful ? 1 : 0,
        bookings_total: 1,
        cancellations: h.guestCancelled ? 1 : 0,
        no_shows: !h.guestShowedUp && !h.guestCancelled ? 1 : 0,
        payments_completed: h.paidAsAgreed ? 1 : 0,
      },
      source: { kind: "booking", bookingId: booking.id },
      evidence,
    });
    const hostCred = await issueCredentialInternal(s, {
      org,
      holder: host,
      credentialType: "PROVIDER_OUTCOME",
      category: listing.category,
      values: {
        completed_bookings: g.serviceCompleted && !g.hostCancelled ? 1 : 0,
        bookings_accepted: 1,
        host_cancellations: g.hostCancelled ? 1 : 0,
        accurate_listings: g.listingAccurate ? 1 : 0,
      },
      source: { kind: "booking", bookingId: booking.id },
      evidence,
    });
    issued.push(
      {
        side: "guest",
        credentialId: guestCred.metadata.credentialId,
        txId: guestCred.receipt.txId,
        blockNumber: guestCred.receipt.blockNumber,
        trustlineId: guest.trustlineId,
      },
      {
        side: "host",
        credentialId: hostCred.metadata.credentialId,
        txId: hostCred.receipt.txId,
        blockNumber: hostCred.receipt.blockNumber,
        trustlineId: host.trustlineId,
      },
    );
    updated.status = "REVIEWED";
    updated.issuedCredentialIds = issued.map((i) => i.credentialId);
  }

  await s.store.put("bookings", updated);
  await recordActivity(s, {
    ownerId: userId,
    kind: "feedback_submitted",
    actor: "You",
    title: `Feedback recorded · ${listing.title}`,
    detail: input.side === "guest" ? "How the provider behaved — no star rating." : "How the customer behaved — no star rating.",
    ref: { type: "booking", id: booking.id },
  });
  return { booking: updated, issued };
}
