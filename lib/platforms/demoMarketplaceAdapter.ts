import { LISTINGS } from "@/lib/demo/cast";
import type { Listing } from "@/types";
import type { PlatformAdapter } from "./types";

/** OneCity — the internal demo marketplace. Not a real company. */
export const demoMarketplaceAdapter: PlatformAdapter = {
  platformId: "org_onecity",
  platformName: "OneCity",
  listListings: () => LISTINGS,
  getListing: (id) => LISTINGS.find((l) => l.id === id) ?? null,
  subjectForListing: (id) => LISTINGS.find((l) => l.id === id)?.providerUserId ?? null,
};

export const SERVICE_FEE_RATE = 0.08;

export function listingsFor(category?: string): Listing[] {
  return category ? LISTINGS.filter((l) => l.category === category) : LISTINGS;
}
