import type { Listing } from "@/types";

/**
 * A platform adapter maps a third-party platform's concepts (listings, hosts,
 * sellers, drivers…) onto Trustline subjects. Real integrations
 * (e.g. airbnbAdapter.ts, rideAdapter.ts, restaurantAdapter.ts) would
 * implement this interface against an official partner API. None exist yet:
 * only the internal demo marketplace is implemented.
 */
export interface PlatformAdapter {
  readonly platformId: string;
  readonly platformName: string;
  listListings(): Listing[];
  getListing(id: string): Listing | null;
  /** Resolve the Trustline subject (user id) behind a platform seller. */
  subjectForListing(id: string): string | null;
}
