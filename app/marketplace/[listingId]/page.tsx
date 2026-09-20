import { Check, ChevronLeft, Star } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TrustlineOverlay } from "@/components/extension/trustline-overlay";
import { BookingPanel } from "@/components/marketplace/booking-panel";
import { ListingArt } from "@/components/marketplace/listing-art";
import { HostTrustPanel } from "@/components/trust/trust-badge";
import { optionalUser } from "@/lib/auth/guards";
import { CATEGORIES } from "@/lib/platforms/categories";
import { demoMarketplaceAdapter } from "@/lib/platforms/demoMarketplaceAdapter";
import { holderReputation, publicTrustByUserId } from "@/lib/services/trust";

export async function generateMetadata(props: PageProps<"/marketplace/[listingId]">) {
  const { listingId } = await props.params;
  return { title: demoMarketplaceAdapter.getListing(listingId)?.title ?? "Listing" };
}

function nextFriday() {
  const d = new Date();
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7));
  return d.toISOString().slice(0, 10);
}

export default async function ListingPage(props: PageProps<"/marketplace/[listingId]">) {
  const { listingId } = await props.params;
  const listing = demoMarketplaceAdapter.getListing(listingId);
  if (!listing) notFound();
  const cat = CATEGORIES[listing.category];
  const { s, user } = await optionalUser();
  const providerTrust = await publicTrustByUserId(s, listing.providerUserId);
  let viewer = null;
  if (user) {
    const rep = await holderReputation(s, user.id);
    viewer = {
      trustlineId: user.trustlineId,
      name: user.displayName,
      bookingReliability: rep.buyer.metrics[0].value,
      limitedHistory: rep.buyer.limitedHistory || rep.buyer.sampleSize === 0,
      isProvider: user.id === listing.providerUserId,
    };
  }
  const index = demoMarketplaceAdapter.listListings().findIndex((l) => l.id === listing.id);

  return (
    <div>
      <Link
        href={`/marketplace?category=${listing.category}`}
        className="mb-4 inline-flex h-10 items-center gap-1 text-[14px] font-medium text-[#3b2c25] hover:underline"
      >
        <ChevronLeft className="size-4" /> {cat.label}
      </Link>
      <h1 className="text-[26px] font-bold tracking-[-0.03em] sm:text-[32px]">{listing.title}</h1>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[14.5px] text-[#7a6d66]">
        {listing.rating ? (
          <span className="inline-flex items-center gap-1 text-[#221a16]">
            <Star className="size-3.5 fill-current" /> {listing.rating} · {listing.reviewCount?.toLocaleString("en-IN")} reviews
          </span>
        ) : (
          <span>New listing</span>
        )}
        <span>·</span>
        <span>{listing.neighbourhood}</span>
      </p>

      <div className="mt-5 grid h-[240px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl sm:h-[380px]">
        <div className="col-span-4 row-span-2 sm:col-span-2">
          <ListingArt palette={listing.palette} variant={index} category={listing.category} />
        </div>
        {[1, 2, 3, 4].map((v) => (
          <div key={v} className="hidden sm:block">
            <ListingArt palette={listing.palette} variant={index + v} category={listing.category} />
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-4 border-b border-[#efe9e4] pb-6">
            <div>
              <h2 className="text-[20px] font-semibold">
                {cat.provider}: {listing.providerName}{" "}
                <span className="text-[15px] font-normal text-[#7a6d66]">({listing.providerLabel})</span>
              </h2>
              <p className="mt-2 flex flex-wrap gap-2 text-[13.5px] text-[#7a6d66]">
                {listing.highlights.map((h) => (
                  <span key={h} className="rounded-full bg-[#f6f1ed] px-2.5 py-1">
                    {h}
                  </span>
                ))}
              </p>
            </div>
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-[#f3e6df] text-[18px] font-semibold text-[#8a3b27]">
              {listing.providerName.slice(0, 1)}
            </span>
          </div>

          <section className="border-b border-[#efe9e4] py-6">
            <h3 className="mb-3 text-[17px] font-semibold">Before you book: {listing.providerName}&apos;s Trustline</h3>
            <p className="mb-4 text-[14px] text-[#7a6d66]">
              On OneCity since {listing.providerSince} ·{" "}
              <Link href={`/t/${providerTrust.trustlineId}`} className="font-medium text-[#3b2c25] underline-offset-2 hover:underline">
                Public Trustline profile ({providerTrust.trustlineId})
              </Link>
            </p>
            <HostTrustPanel trust={providerTrust} category={listing.category} />
          </section>

          <section className="py-6">
            <p className="text-[15.5px] leading-relaxed text-[#3b2c25]">{listing.description}</p>
            <ul className="mt-5 grid grid-cols-1 gap-3 text-[15px] sm:grid-cols-2">
              {listing.highlights.map((a) => (
                <li key={a} className="flex items-center gap-3">
                  <Check className="size-4 text-[#7a6d66]" /> {a}
                </li>
              ))}
            </ul>
          </section>
        </div>
        <div>
          <BookingPanel listing={listing} providerTrust={providerTrust} viewer={viewer} defaultDate={nextFriday()} />
        </div>
      </div>

      <TrustlineOverlay trust={providerTrust} role={cat.provider} />
    </div>
  );
}
