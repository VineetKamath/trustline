import "server-only";
import { buyerContext, guestContext, hostingSummary, sellerContext } from "@/lib/reputation/engine";
import type { UserRecord } from "@/types";
import type { Services } from "./context";
import { listHolderCredentials, toReputationInput } from "./credentials";
import { findUserByTrustlineId, getUser } from "./wallet";

/** Full reputation for the holder's own dashboard (holder-only). */
export async function holderReputation(s: Services, userId: string) {
  const credentials = await listHolderCredentials(s, userId);
  const input = toReputationInput(credentials);
  return {
    credentials,
    buyer: buyerContext(input),
    seller: sellerContext(input),
    guest: guestContext(input),
  };
}

export interface PublicTrustSummary {
  trustlineId: string;
  status: "VERIFIED" | "LIMITED";
  verifiedCredentials: number;
  /** Credentials an issuer (or the holder) revoked. Stated as a fact, not a verdict. */
  revokedCredentials: number;
  issuers: string[];
  hosting?: {
    completedBookings: number;
    acceptedBookings: number;
    completionRate: number | null;
    cancellations: number;
    disputeLevel: "Low" | "Moderate" | "High";
    limitedHistory: boolean;
  };
  buyer?: { bookingReliability: number | null };
  seller?: { transactionCompletion: number | null };
  checkedAt: string;
}

/**
 * The public face of a Trustline: only the claims the holder chose to
 * publish, each backed by credentials that are re-verified against the ledger
 * on every call. No names, no history, no per-transaction data.
 */
export async function publicTrustSummary(s: Services, user: UserRecord): Promise<PublicTrustSummary> {
  const credentials = await listHolderCredentials(s, user.id);
  const valid = [];
  const revokedCredentials = credentials.filter((c) => c.status !== "ACTIVE").length;
  for (const c of credentials) {
    const check = await s.chain.verifyCredential(c.credentialId, c.claimCommitment);
    if (check.valid) valid.push(c);
  }
  const input = toReputationInput(valid);
  const summary: PublicTrustSummary = {
    trustlineId: user.trustlineId,
    status: valid.length > 0 ? "VERIFIED" : "LIMITED",
    verifiedCredentials: valid.length,
    revokedCredentials,
    issuers: [...new Set(valid.map((c) => c.issuerName))],
    checkedAt: new Date().toISOString(),
  };
  if (user.publishedClaims.includes("hosting_summary")) {
    const h = hostingSummary(input);
    if (h.credentialCount > 0) {
      summary.hosting = {
        completedBookings: h.completedBookings,
        acceptedBookings: h.acceptedBookings,
        completionRate: h.completionRate,
        cancellations: h.cancellations,
        disputeLevel: h.disputeLevel,
        limitedHistory: h.acceptedBookings < 5,
      };
    }
  }
  if (user.publishedClaims.includes("booking_reliability")) {
    summary.buyer = { bookingReliability: buyerContext(input).metrics[0].value };
  }
  if (user.publishedClaims.includes("seller_completion")) {
    summary.seller = { transactionCompletion: sellerContext(input).metrics[0].value };
  }
  if (!user.publishedClaims.includes("verified_credentials") && !user.publishedClaims.includes("hosting_summary")) {
    summary.issuers = [];
  }
  return summary;
}

export async function publicTrustByTrustlineId(s: Services, trustlineId: string) {
  const user = await findUserByTrustlineId(s, trustlineId);
  return user ? publicTrustSummary(s, user) : null;
}

export async function publicTrustByUserId(s: Services, userId: string) {
  return publicTrustSummary(s, await getUser(s, userId));
}
