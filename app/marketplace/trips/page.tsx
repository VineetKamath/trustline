import Link from "next/link";
import { redirect } from "next/navigation";
import { ListingArt } from "@/components/marketplace/listing-art";
import { optionalUser } from "@/lib/auth/guards";
import { inr } from "@/lib/format";
import { CATEGORIES } from "@/lib/platforms/categories";
import { listGuestBookings, listHostBookings } from "@/lib/services/marketplace";
import type { BookingRecord, BookingStatus, Listing } from "@/types";

export const metadata = { title: "My bookings" };

const STATUS: Record<BookingStatus, { label: string; className: string }> = {
  REQUESTED: { label: "Waiting for the provider to accept", className: "text-[#a06a1f]" },
  DECLINED: { label: "Declined by the provider", className: "text-[#7a6d66]" },
  CONFIRMED: { label: "Confirmed", className: "text-[#2f6b4f]" },
  COMPLETED: { label: "Awaiting feedback", className: "text-[#c2553a]" },
  REVIEWED: { label: "Reviewed", className: "text-[#2f6b4f]" },
};

function BookingRow({ booking, listing, subtitle }: { booking: BookingRecord; listing: Listing; subtitle: string }) {
  const cat = CATEGORIES[booking.category];
  const status = STATUS[booking.status];
  return (
    <Link
      href={`/marketplace/trips/${booking.id}`}
      className="flex items-center gap-4 rounded-2xl border border-[#efe9e4] p-3 transition-shadow hover:shadow-[0_4px_18px_rgb(0_0_0/0.07)]"
    >
      <div className="size-20 shrink-0 overflow-hidden rounded-xl">
        <ListingArt palette={listing.palette} category={listing.category} />
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold">{listing.title}</p>
        <p className="truncate text-[13.5px] text-[#7a6d66]">{subtitle}</p>
        <p className="text-[13.5px] text-[#7a6d66]">
          {cat.label} · {booking.checkIn} · {inr(booking.total)}
        </p>
        <p className={`mt-0.5 text-[12px] font-semibold uppercase tracking-wide ${status.className}`}>{status.label}</p>
      </div>
    </Link>
  );
}

export default async function TripsPage() {
  const { s, user } = await optionalUser();
  if (!user) redirect("/login");
  const [asCustomer, asProvider] = await Promise.all([listGuestBookings(s, user.id), listHostBookings(s, user.id)]);
  const names = new Map<string, string>();
  for (const { booking } of asProvider) {
    if (!names.has(booking.guestUserId)) {
      const g = await s.store.get("users", booking.guestUserId);
      names.set(booking.guestUserId, g ? `${g.displayName} (${g.trustlineId})` : "Customer");
    }
  }
  const toReview = asProvider.filter((b) => b.booking.status === "REQUESTED");
  const answered = asProvider.filter((b) => b.booking.status !== "REQUESTED");

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      {toReview.length > 0 ? (
        <section>
          <h2 className="text-[22px] font-bold tracking-[-0.02em]">
            {toReview.length} {toReview.length === 1 ? "request" : "requests"} waiting for your decision
          </h2>
          <p className="mt-1 text-[14.5px] text-[#7a6d66]">
            Nothing is booked until you accept. Open each one to see the customer&apos;s Trustline first.
          </p>
          <div className="mt-5 space-y-3">
            {toReview.map(({ booking, listing }) => (
              <BookingRow
                key={booking.id}
                booking={booking}
                listing={listing}
                subtitle={`${CATEGORIES[listing.category].customer}: ${names.get(booking.guestUserId)}`}
              />
            ))}
          </div>
        </section>
      ) : null}

      {asCustomer.length > 0 || asProvider.length === 0 ? (
        <section>
          <h1 className="text-[28px] font-bold tracking-[-0.03em]">My bookings</h1>
          <p className="mt-1 text-[14.5px] text-[#7a6d66]">What {user.displayName} booked, rented, ordered or hired.</p>
          {asCustomer.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-[#e2d9d2] p-8 text-center">
              <p className="font-semibold">Nothing booked yet</p>
              <Link href="/marketplace" className="mt-3 inline-block text-[14px] font-medium text-[#c2553a] hover:underline">
                Start exploring
              </Link>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {asCustomer.map(({ booking, listing }) => (
                <BookingRow
                  key={booking.id}
                  booking={booking}
                  listing={listing}
                  subtitle={`${CATEGORIES[listing.category].provider}: ${listing.providerName} (${listing.providerLabel})`}
                />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {answered.length > 0 ? (
        <section>
          <h2 className="text-[22px] font-bold tracking-[-0.02em]">As a provider</h2>
          <p className="mt-1 text-[14.5px] text-[#7a6d66]">Customers who asked to book {user.displayName}&apos;s listings.</p>
          <div className="mt-5 space-y-3">
            {answered.map(({ booking, listing }) => (
              <BookingRow
                key={booking.id}
                booking={booking}
                listing={listing}
                subtitle={`${CATEGORIES[listing.category].customer}: ${names.get(booking.guestUserId)}`}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
