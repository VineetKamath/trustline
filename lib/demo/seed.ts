import "server-only";
import { config } from "@/lib/config";
import type { Services } from "@/lib/services/context";
import { issueCredentialInternal, revokeCredential } from "@/lib/services/credentials";
import { completeBooking, createBooking, respondToBooking, submitFeedback } from "@/lib/services/marketplace";
import { createOrganization } from "@/lib/services/organizations";
import {
  approveRequest,
  createVerificationRequest,
  declineRequest,
  interpretRequest,
  proveRequest,
} from "@/lib/services/verification";
import { createUserWallet } from "@/lib/services/wallet";
import type { OrganizationRecord, RevocationReason, UserRecord, VerificationRequestRecord } from "@/types";
import { demoMarketplaceAdapter } from "@/lib/platforms/demoMarketplaceAdapter";
import { ORGS, PEOPLE, SEEDED_TRANSACTIONS, SEEDED_VERIFICATIONS } from "./cast";

export const SEED_VERSION = "trustline-seed-v7";

const ago = (base: number, { d = 0, h = 0, m = 0 }: { d?: number; h?: number; m?: number }) =>
  new Date(base - ((d * 24 + h) * 60 + m) * 60_000).toISOString();

/**
 * Runs one seeded verification end to end. A phrasing the interpreter cannot
 * turn into a claim is skipped with a warning rather than aborting the seed —
 * one awkward sentence in the demo script must never take the app down with
 * it. The `tests/demo-cast.test.ts` guard is what stops those reaching here.
 */
async function seedVerification(
  s: Services,
  orgId: string,
  text: string,
  subjectTrustlineId: string,
  at: string,
  respond?: (request: VerificationRequestRecord) => Promise<void>,
) {
  try {
    const interpretation = await interpretRequest(s, orgId, text);
    const request = await createVerificationRequest(s, orgId, {
      subjectTrustlineId,
      interpretationId: interpretation.id,
      at,
    });
    if (request.status !== "PENDING") return; // refused by Cedar — that is a demo case in itself
    await respond?.(request);
  } catch (error) {
    console.warn(`[trustline] skipped seeded verification "${text}":`, error instanceof Error ? error.message : error);
  }
}

async function seed(s: Services) {
  const base = Date.now();

  const orgs: Record<string, OrganizationRecord> = {};
  for (const o of ORGS) orgs[o.id] = await createOrganization(s, o, ago(base, { d: 900 }));

  const people: Record<string, UserRecord> = {};
  for (const p of PEOPLE) {
    people[p.id] = await createUserWallet(s, {
      id: p.id,
      displayName: p.name,
      seed: p.seed,
      publishedClaims: p.published,
      loginEnabled: true,
      at: ago(base, { d: 1000 }),
    });
  }

  // Credentials issued by platforms across the network.
  const revocations: { credentialId: string; issuer: string; holder: string; by: "issuer" | "holder"; reason: RevocationReason }[] = [];
  for (const p of PEOPLE) {
    for (const c of p.credentials) {
      const { metadata } = await issueCredentialInternal(s, {
        org: orgs[c.issuer],
        holder: people[p.id],
        credentialType: c.type,
        values: c.values,
        category: c.category,
        at: ago(base, { d: c.daysAgo, h: 2 }),
      });
      if (c.revokedDaysAgo !== undefined) {
        revocations.push({
          credentialId: metadata.credentialId,
          issuer: c.issuer,
          holder: p.id,
          by: c.revokedBy ?? "issuer",
          reason: c.revocationReason ?? (c.issuer === "org_citystay" ? "PLATFORM_POLICY" : "ISSUER_CORRECTION"),
        });
      }
    }
  }

  // Credentials are pulled back either by the platform that issued them
  // (policy review, data correction) or by the holder who no longer wants it
  // used. Both paths end with the ledger marking the credential REVOKED.
  for (const r of revocations) {
    const actor = r.by === "holder" ? ({ kind: "holder", userId: r.holder } as const) : ({ kind: "issuer", orgId: r.issuer } as const);
    await revokeCredential(s, actor, r.credentialId, r.reason);
  }

  // OneCity bookings. Every one starts as a request the provider has to answer:
  // some are still outstanding, some were turned down on the strength of the
  // customer's published Trustline, and the rest ran to two-sided feedback.
  for (const t of SEEDED_TRANSACTIONS) {
    const listing = demoMarketplaceAdapter.getListing(t.listing);
    if (!listing || listing.providerUserId === t.customer) continue;
    const provider = listing.providerUserId;
    const checkIn = ago(base, { d: t.daysAgo + t.quantity }).slice(0, 10);
    const booking = await createBooking(s, t.customer, { listingId: t.listing, checkIn, quantity: t.quantity });
    if (t.awaitingDecision) continue;
    if (t.declinedBecause) {
      await respondToBooking(s, provider, booking.id, { decision: "decline", reason: t.declinedBecause });
      continue;
    }
    await respondToBooking(s, provider, booking.id, { decision: "accept" });
    await completeBooking(s, t.customer, booking.id);
    await submitFeedback(s, t.customer, booking.id, { side: "guest", feedback: t.customerSays });
    await submitFeedback(s, provider, booking.id, { side: "host", feedback: t.providerSays });
  }

  // Past verifications with real proofs, covering every outcome: verified,
  // not satisfied, failed on a revoked credential, declined by the holder and
  // refused outright by Cedar.
  for (const v of SEEDED_VERIFICATIONS.filter((x) => x.holder !== "pending")) {
    const at = ago(base, { d: v.d, h: v.h ?? 3 });
    await seedVerification(s, v.org, v.text, people[v.subject].trustlineId, at, async (request) => {
      if (v.holder === "decline") {
        await declineRequest(s, v.subject, request.id, at);
        return;
      }
      await approveRequest(s, v.subject, request.id, at);
      await proveRequest(s, v.subject, request.id, at);
    });
  }

  // Open requests waiting for people to answer.
  for (const v of SEEDED_VERIFICATIONS.filter((x) => x.holder === "pending")) {
    await seedVerification(s, v.org, v.text, people[v.subject].trustlineId, ago(base, { m: 2 + (v.h ?? 0) }));
  }

  await s.store.put("meta", { id: "seed", value: SEED_VERSION });
}

export async function ensureSeeded(s: Services) {
  if (!config.demoMode) return;
  const marker = await s.store.get("meta", "seed");
  const height = await s.chain.height();
  const chainOk = s.chain.mode !== "local" || height > 0;
  if (marker?.value === SEED_VERSION && chainOk) return;
  await resetAndSeed(s);
}

function resetAdapters(s: Services) {
  // Duck-typed so it survives dev hot reloads (class identity changes).
  const resettable = s.chain as { reset?: () => void };
  if (typeof resettable.reset === "function") resettable.reset();
}

export async function resetAndSeed(s: Services) {
  await s.store.clear();
  resetAdapters(s);
  try {
    await seed(s);
  } catch (error) {
    // A half-written .data directory (an interrupted seed, a ledger left over
    // from an older cast) must never leave the app unusable — in particular it
    // must not block someone creating a brand new Trustline. Wipe everything
    // once and seed from scratch; only a second failure is a real bug.
    console.error("[trustline] seed failed, retrying from a clean slate:", error instanceof Error ? error.message : error);
    await s.store.clear();
    resetAdapters(s);
    await seed(s);
  }
}
