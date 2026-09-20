import { describe, expect, it } from "vitest";
import { interpretLocally } from "@/lib/aws/strands/localInterpreter";
import { SEEDED_VERIFICATIONS } from "@/lib/demo/cast";

describe("interpreter covers every seeded question", () => {
  const cases: [string, Record<string, unknown>][] = [
    ["Does this driver have at least 500 completed rides?", { claim: "completed_bookings_hosted", threshold: 500, purpose: "seller_verification" }],
    ["Does this store have at least 50 delivered orders?", { claim: "completed_bookings_hosted", threshold: 50 }],
    ["Is this car owner's completion rate at least 95%?", { claim: "provider_completion_pct", threshold: 95, purpose: "seller_verification" }],
    ["Is this freelancer's completion rate at least 95%?", { claim: "provider_completion_pct" }],
    ["Is the seller completion rate at least 95%?", { claim: "seller_completion_pct" }],
    ["Is this client's payment reliability at least 90%?", { claim: "payment_reliability_pct", purpose: "buyer_verification" }],
    ["Does this host have at least 20 completed bookings?", { claim: "completed_bookings_hosted", purpose: "host_verification" }],
    ["Is this rider's booking reliability at least 95%?", { claim: "booking_reliability_pct", purpose: "buyer_verification" }],
    ["Does this shopper have at least 3 successful orders?", { claim: "successful_transactions", purpose: "buyer_verification" }],
    ["Does this seller have at least 25 successful transactions?", { claim: "successful_transactions", purpose: "seller_verification" }],
    ["Has this guest completed at least 5 stays?", { claim: "completed_stays", purpose: "guest_verification" }],
  ];
  for (const [q, expected] of cases) it(q, () => expect(interpretLocally(q)).toMatchObject(expected));

  it("every seeded question is interpretable", () => {
    for (const v of SEEDED_VERIFICATIONS) expect(interpretLocally(v.text).kind, v.text).not.toMatch(/clarification|unsupported/);
  });
});
