import { Star } from "lucide-react";
import Link from "next/link";
import { ListingArt } from "@/components/marketplace/listing-art";
import { inr } from "@/lib/format";
import { CATEGORIES, CATEGORY_ORDER, type Category } from "@/lib/platforms/categories";
import { listingsFor } from "@/lib/platforms/demoMarketplaceAdapter";
import type { Listing } from "@/types";

export const metadata = { title: "OneCity — book anything" };

function isCategory(value: string | undefined): value is Category {
  return value !== undefined && (CATEGORY_ORDER as string[]).includes(value);
}

function ListingCard({ listing, index }: { listing: Listing; index: number }) {
  const cat = CATEGORIES[listing.category];
  return (
    <Link href={`/marketplace/${listing.id}`} className="group block">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
        <ListingArt palette={listing.palette} variant={index} category={listing.category} />
        {listing.tag ? (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[12px] font-semibold text-[#2b1d17] shadow-sm">
            {listing.tag}
          </span>
        ) : null}
      </div>
      <div className="mt-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-semibold text-[#221a16]">{listing.title}</p>
          {listing.rating ? (
            <span className="inline-flex shrink-0 items-center gap-1 text-[13.5px] text-[#221a16]">
              <Star className="size-3.5 fill-current" /> {listing.rating}
            </span>
          ) : (
            <span className="shrink-0 text-[13px] text-[#7a6d66]">New</span>
          )}
        </div>
        <p className="mt-0.5 text-[13.5px] text-[#7a6d66]">
          {cat.label} · {listing.neighbourhood}
        </p>
        {/* The bracket always explains who this person is — never a bare role word. */}
        <p className="mt-1 text-[13px] leading-snug text-[#7a6d66]">
          <span className="font-medium text-[#3b2c25]">
            {cat.provider} ({cat.providerMeans}):
          </span>{" "}
          {listing.providerName} ({listing.providerLabel})
        </p>
        <p className="mt-1.5 text-[14px] text-[#221a16]">
          <span className="font-semibold">{inr(listing.price)}</span>{" "}
          <span className="text-[#7a6d66]">per {cat.unit}</span>
        </p>
      </div>
    </Link>
  );
}

export default async function MarketplacePage(props: PageProps<"/marketplace">) {
  const params = await props.searchParams;
  const raw = Array.isArray(params.category) ? params.category[0] : params.category;
  const active = isCategory(raw) ? raw : null;
  const listings = listingsFor(active ?? undefined);

  return (
    <div>
      <section className="mb-7">
        <h1 className="text-[26px] font-bold tracking-[-0.03em] sm:text-[32px]">
          {active ? CATEGORIES[active].label : "Book anything in the city"}
        </h1>
        <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-[#7a6d66]">
          {active ? (
            <>
              {CATEGORIES[active].blurb}. The {CATEGORIES[active].provider.toLowerCase()} is{" "}
              {CATEGORIES[active].providerMeans}; the {CATEGORIES[active].customer.toLowerCase()} is{" "}
              {CATEGORIES[active].customerMeans}. Both sides earn a Trustline credential when the booking is done.
            </>
          ) : (
            <>
              {CATEGORY_ORDER.length} kinds of service, one reputation. Every completed booking here issues a signed
              credential to both sides — and every provider below can be checked before you book.
            </>
          )}
        </p>
      </section>

      {active ? null : (
        <section className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {CATEGORY_ORDER.map((c) => (
            <Link
              key={c}
              href={`/marketplace?category=${c}`}
              className="rounded-2xl border border-[#efe9e4] p-3 transition-shadow hover:shadow-[0_4px_18px_rgb(0_0_0/0.07)]"
            >
              <p className="text-[14px] font-semibold text-[#221a16]">{CATEGORIES[c].label}</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-[#7a6d66]">{CATEGORIES[c].blurb}</p>
            </Link>
          ))}
        </section>
      )}

      {listings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#e2d9d2] p-10 text-center">
          <p className="font-semibold">Nothing listed in this category yet</p>
          <Link href="/marketplace" className="mt-3 inline-block text-[14px] font-medium text-[#c2553a] hover:underline">
            Browse everything
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {listings.map((l, i) => (
            <ListingCard key={l.id} listing={l} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
