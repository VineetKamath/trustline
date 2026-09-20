import fs from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { getServices, type Services } from "@/lib/services/context";
import { DEMO_IDS } from "@/lib/demo/personas";
import { listHolderCredentials, issueByIssuer, revokeCredential } from "@/lib/services/credentials";
import { holderReputation, publicTrustByUserId } from "@/lib/services/trust";
import {
  approveRequest,
  createVerificationRequest,
  declineRequest,
  interpretRequest,
  listHolderRequests,
  proveRequest,
} from "@/lib/services/verification";
import { completeBooking, createBooking, respondToBooking, submitFeedback } from "@/lib/services/marketplace";

let s: Services;

beforeAll(async () => {
  fs.rmSync(".data-test", { recursive: true, force: true });
  s = await getServices();
}, 120_000);

async function ask(text: string, orgId: string = DEMO_IDS.verifier) {
  const i = await interpretRequest(s, orgId, text);
  return createVerificationRequest(s, orgId, { subjectTrustlineId: "TL-7F4A", interpretationId: i.id });
}

describe("seeded demo", () => {
  it("gives Vineet the Trustline ID TL-7F4A", async () => {
    const user = await s.store.get("users", DEMO_IDS.user);
    expect(user?.trustlineId).toBe("TL-7F4A");
  });

  it("computes transparent reputation exactly", async () => {
    const rep = await holderReputation(s, DEMO_IDS.user);
    expect(rep.buyer.metrics.map((m) => m.display)).toEqual(["96%", "100%", "94%"]);
    expect(rep.seller.metrics.map((m) => m.display)).toEqual(["98%", "96%", "Low"]);
    const statuses = rep.credentials.map((c) => c.status);
    expect(statuses.filter((x) => x === "ACTIVE")).toHaveLength(3);
    expect(statuses.filter((x) => x === "REVOKED")).toHaveLength(1);
  });

  it("publishes Arjun's hosting record for listings", async () => {
    const t = await publicTrustByUserId(s, "usr_arjun");
    expect(t.status).toBe("VERIFIED");
    expect(t.hosting).toMatchObject({ completedBookings: 124, completionRate: 98, cancellations: 2, disputeLevel: "Low" });
    const n = await publicTrustByUserId(s, "usr_newhost23");
    expect(n.status).toBe("LIMITED");
    expect(n.verifiedCredentials).toBe(0);
  });

  it("has a seeded pending request and 11 past proofs", async () => {
    const reqs = await listHolderRequests(s, DEMO_IDS.user);
    expect(reqs.filter((r) => r.status === "PENDING")).toHaveLength(1);
    expect(reqs.filter((r) => r.status === "VERIFIED")).toHaveLength(9);
    expect(reqs.filter((r) => r.status === "DECLINED")).toHaveLength(1);
  });
});

describe("scenario B — private threshold proof", () => {
  it("verifies 20+ without revealing 47", async () => {
    const req = await ask("Does this buyer have at least 20 successful bookings?");
    expect(req.policy.decision).toBe("ALLOW");
    expect(req.structured).toMatchObject({ claim: "successful_transactions", threshold: 20, operator: ">=" });
    await approveRequest(s, DEMO_IDS.user, req.id);
    const { result, trace } = await proveRequest(s, DEMO_IDS.user, req.id);
    expect(result.outcome).toBe("VERIFIED");
    expect(Object.values(result.checks).every(Boolean)).toBe(true);
    expect(trace.privateValue).toBe("47");
    const wire = JSON.stringify(result.presentation);
    expect(wire).not.toMatch(/Vineet|"value"|"blinding"/);
    expect(wire).not.toContain(":47");
  });

  it("returns NOT_SATISFIED for thresholds above the private value", async () => {
    const req = await ask("Does this buyer have at least 60 successful transactions?");
    await approveRequest(s, DEMO_IDS.user, req.id);
    const { result } = await proveRequest(s, DEMO_IDS.user, req.id);
    expect(result.outcome).toBe("NOT_SATISFIED");
    expect(result.presentation).toBeUndefined();
  });

  it("proves percentage claims homomorphically", async () => {
    const req = await ask("Is this buyer's booking reliability at least 95%?");
    await approveRequest(s, DEMO_IDS.user, req.id);
    const { result } = await proveRequest(s, DEMO_IDS.user, req.id);
    expect(result.outcome).toBe("VERIFIED");
  });

  it("lets the holder decline", async () => {
    const req = await ask("Does this seller have at least 20 successful transactions?");
    const declined = await declineRequest(s, DEMO_IDS.user, req.id);
    expect(declined.status).toBe("DECLINED");
    await expect(approveRequest(s, DEMO_IDS.user, req.id)).rejects.toThrow();
  });
});

describe("scenario C — Cedar denies over-broad requests", () => {
  it("denies complete transaction history", async () => {
    const req = await ask("Give me the buyer's complete transaction history.");
    expect(req.structured.kind).toBe("full_history");
    expect(req.status).toBe("DENIED_BY_POLICY");
    expect(req.policy.determiningPolicies).toContain("forbid-full-history");
    expect(req.policy.reasons[0]).toBe("The verifier requested information beyond the supported claim.");
  });

  it("denies identity and exact values", async () => {
    expect((await ask("What is the seller's phone number and address?")).status).toBe("DENIED_BY_POLICY");
    expect((await ask("Exactly how many transactions does this buyer have?")).status).toBe("DENIED_BY_POLICY");
  });

  it("denies purposes the verifier is not registered for", async () => {
    const req = await ask("Has this guest completed at least 3 stays?");
    expect(req.status).toBe("DENIED_BY_POLICY");
  });
});

describe("scenario D — booking and two-sided feedback", () => {
  it("leaves the booking with the provider until they accept", async () => {
    const booking = await createBooking(s, DEMO_IDS.user, { listingId: "lst_garden_flat", checkIn: "2026-10-02", quantity: 1 });
    expect(booking.status).toBe("REQUESTED");
    // The provider sees the customer's published claims, and nothing else.
    expect(booking.guestTrust).toMatchObject({ status: "VERIFIED", bookingReliability: 96 });

    // Only the provider decides, and nothing can happen until they do.
    await expect(respondToBooking(s, DEMO_IDS.user, booking.id, { decision: "accept" })).rejects.toThrow(/provider/);
    await expect(completeBooking(s, DEMO_IDS.user, booking.id)).rejects.toThrow(/not accepted/);

    const declined = await respondToBooking(s, "usr_meera", booking.id, {
      decision: "decline",
      reason: "Booked out that week",
    });
    expect(declined.status).toBe("DECLINED");
    expect(declined.declineReason).toBe("Booked out that week");
    // A request that never became a transaction issues no credential to anyone.
    expect(declined.issuedCredentialIds).toHaveLength(0);
    await expect(respondToBooking(s, "usr_meera", booking.id, { decision: "accept" })).rejects.toThrow(/already been answered/);
    await expect(completeBooking(s, DEMO_IDS.user, booking.id)).rejects.toThrow(/declined/);
  });

  it("issues outcome credentials to both sides on the ledger", async () => {
    const booking = await createBooking(s, DEMO_IDS.user, { listingId: "lst_modern_apartment", checkIn: "2026-10-02", quantity: 2 });
    expect(booking.total).toBe(5184);
    expect(booking.status).toBe("REQUESTED");
    const confirmed = await respondToBooking(s, DEMO_IDS.host, booking.id, { decision: "accept" });
    expect(confirmed.status).toBe("CONFIRMED");
    await completeBooking(s, DEMO_IDS.user, booking.id);
    await submitFeedback(s, DEMO_IDS.user, booking.id, {
      side: "guest",
      feedback: { serviceCompleted: true, listingAccurate: true, hostCancelled: false },
    });
    await expect(
      submitFeedback(s, DEMO_IDS.user, booking.id, {
        side: "host",
        feedback: { guestShowedUp: true, paidAsAgreed: true, guestCancelled: false },
      }),
    ).rejects.toThrow(/Only the host/);
    const { issued } = await submitFeedback(s, DEMO_IDS.host, booking.id, {
      side: "host",
      feedback: { guestShowedUp: true, paidAsAgreed: true, guestCancelled: false },
    });
    expect(issued).toHaveLength(2);
    const rep = await holderReputation(s, DEMO_IDS.user);
    expect(rep.buyer.metrics.map((m) => m.display)).toEqual(["96%", "100%", "94%"]);
    expect(rep.buyer.totals[0].value).toBe(48);
    const arjun = await publicTrustByUserId(s, "usr_arjun");
    expect(arjun.hosting?.completedBookings).toBe(125);
  });
});

describe("issuer console", () => {
  it("Cedar blocks types the issuer is not registered for", async () => {
    const r = await issueByIssuer(s, DEMO_IDS.issuer, { trustlineId: "TL-7F4A", credentialType: "COMPLETED_STAY_COUNT", value: 3 });
    expect(r.ok).toBe(false);
  });
});

describe("scenario E — revocation", () => {
  it("makes future verification fail", async () => {
    const creds = await listHolderCredentials(s, DEMO_IDS.user);
    const market = creds.find((c) => c.credentialType === "MARKETPLACE_REPUTATION")!;
    const denied = await revokeCredential(s, { kind: "issuer", orgId: "org_work_platform" }, market.credentialId);
    expect(denied.policy.decision).toBe("DENY");
    const res = await revokeCredential(s, { kind: "issuer", orgId: DEMO_IDS.issuer }, market.credentialId);
    expect(res.metadata?.status).toBe("REVOKED");
    expect((await s.chain.getCredentialStatus(market.credentialId)).status).toBe("REVOKED");

    const req = await ask("Does this buyer have at least 40 successful transactions?");
    await approveRequest(s, DEMO_IDS.user, req.id);
    const { result } = await proveRequest(s, DEMO_IDS.user, req.id);
    expect(result.outcome).toBe("FAILED");
    expect(result.chainStatus).toBe("REVOKED");
  });
});

describe("demo cases across the network", () => {
  const outcomes = async (userId: string) =>
    (await listHolderRequests(s, userId)).map((r) => `${r.status}:${r.label}`);

  it("Karan (frequent no-show guest) sits at ~10% and fails reliability checks", async () => {
    const rep = await holderReputation(s, "usr_karan");
    expect(rep.buyer.metrics[0].value).toBe(10);
    const o = await outcomes("usr_karan");
    expect(o.some((x) => x.startsWith("NOT_SATISFIED:Booking reliability ≥ 80%"))).toBe(true);
    expect(o.some((x) => x.startsWith("DENIED_BY_POLICY"))).toBe(true);
    expect(o.some((x) => x.startsWith("PENDING"))).toBe(true);
  });

  /**
   * The demo script quotes these numbers out loud, and they are easy to move
   * by accident: a provider-cancelled booking credits the *customer*, so one
   * stray seeded row silently lifts a 0% holder off zero.
   */
  it("holds the headline percentages the demo script quotes", async () => {
    expect((await holderReputation(s, "usr_zaid")).buyer.metrics[0].value, "Zaid is the 0% customer").toBe(0);
    expect((await holderReputation(s, "usr_omkar")).seller.metrics[0].value, "Omkar is the 0% provider").toBe(0);
    expect((await holderReputation(s, "usr_karan")).buyer.metrics[0].value, "Karan is the 10% customer").toBe(10);
    expect((await holderReputation(s, "usr_bhaskar")).seller.metrics[0].value, "Bhaskar is the 10% provider").toBe(10);
    expect((await holderReputation(s, "usr_neha")).buyer.metrics[0].value, "Neha is the 100% customer").toBe(100);
    expect((await holderReputation(s, "usr_imran")).seller.metrics[0].value, "Imran is the 100% provider").toBe(100);
  });

  it("covers cancellations, payments, disputes and thin history", async () => {
    expect((await holderReputation(s, "usr_ananya")).buyer.metrics[2].value).toBeLessThan(70);
    expect((await holderReputation(s, "usr_nikhil")).buyer.metrics[1].value).toBeLessThanOrEqual(55);
    expect((await holderReputation(s, "usr_rohan")).seller.metrics[2].display).toBe("High");
    expect((await holderReputation(s, "usr_kabir")).seller.metrics[2].display).toBe("Moderate");
    expect((await holderReputation(s, "usr_manoj")).seller.limitedHistory).toBe(true);
    expect((await holderReputation(s, "usr_divya")).buyer.limitedHistory).toBe(true);
    expect((await holderReputation(s, "usr_vikram")).seller.metrics[0].value).toBeLessThan(75);
  });

  it("revoked and empty records fail verification without accusing anyone", async () => {
    expect((await outcomes("usr_quickstays"))[0]).toMatch(/^FAILED/);
    expect((await outcomes("usr_newhost23"))[0]).toMatch(/^FAILED/);
    const q = await publicTrustByUserId(s, "usr_quickstays");
    expect(q.status).toBe("LIMITED");
    expect(q.revokedCredentials).toBe(1);
  });

  it("verifies good records in every category", async () => {
    for (const id of ["usr_priya", "usr_suresh", "usr_sneha", "usr_rahul", "usr_ananya", "usr_rohan"]) {
      expect((await outcomes(id)).some((x) => x.startsWith("VERIFIED")), id).toBe(true);
    }
    expect((await outcomes("usr_tarun"))[0]).toMatch(/^DECLINED/);
    expect((await outcomes("usr_nikhil")).some((x) => x.startsWith("DENIED_BY_POLICY"))).toBe(true);
  });
});
