import { describe, expect, it } from "vitest";
import { interpretLocally } from "@/lib/aws/strands/localInterpreter";
import { LISTINGS, ORGS, PEOPLE, SEEDED_TRANSACTIONS, SEEDED_VERIFICATIONS } from "@/lib/demo/cast";
import { CATEGORIES, CATEGORY_ORDER } from "@/lib/platforms/categories";

const personIds = new Set(PEOPLE.map((p) => p.id));
const orgIds = new Set(ORGS.map((o) => o.id));
const listingIds = new Set(LISTINGS.map((l) => l.id));

describe("demo cast", () => {
  it("every category is listed in CATEGORY_ORDER exactly once", () => {
    expect([...CATEGORY_ORDER].sort()).toEqual(Object.keys(CATEGORIES).sort());
    expect(new Set(CATEGORY_ORDER).size).toBe(CATEGORY_ORDER.length);
  });

  it("every category has at least one listing to book", () => {
    const covered = new Set(LISTINGS.map((l) => l.category));
    expect([...CATEGORY_ORDER].filter((c) => !covered.has(c))).toEqual([]);
  });

  it("ids are unique", () => {
    expect(personIds.size).toBe(PEOPLE.length);
    expect(orgIds.size).toBe(ORGS.length);
    expect(listingIds.size).toBe(LISTINGS.length);
  });

  it("every label explains itself rather than naming a bare role", () => {
    // A bracketed label is the only explanation the viewer gets, so it has to
    // be a phrase, not a word like "new host".
    for (const p of PEOPLE) {
      expect(p.label.split(/\s+/).length, `${p.name}: "${p.label}"`).toBeGreaterThan(4);
    }
    for (const o of ORGS) {
      expect(o.label.split(/\s+/).length, `${o.name}: "${o.label}"`).toBeGreaterThan(4);
    }
  });

  it("every credential is issued by an organisation that is allowed to issue that type", () => {
    for (const p of PEOPLE) {
      for (const c of p.credentials) {
        const org = ORGS.find((o) => o.id === c.issuer);
        expect(org, `${p.name} -> ${c.issuer}`).toBeDefined();
        expect(org!.roles).toContain("issuer");
        expect(org!.allowedCredentialTypes, `${org!.name} -> ${c.type}`).toContain(c.type);
      }
    }
  });

  it("every listing points at a cast member and copies their label verbatim", () => {
    for (const l of LISTINGS) {
      const person = PEOPLE.find((p) => p.id === l.providerUserId);
      expect(person, l.id).toBeDefined();
      expect(l.providerLabel).toBe(person!.label);
    }
  });

  it("no seeded transaction has someone booking their own listing", () => {
    for (const t of SEEDED_TRANSACTIONS) {
      expect(personIds.has(t.customer), t.customer).toBe(true);
      const listing = LISTINGS.find((l) => l.id === t.listing);
      expect(listing, t.listing).toBeDefined();
      expect(listing!.providerUserId, `${t.customer} booking ${t.listing}`).not.toBe(t.customer);
    }
  });

  it("every seeded verification names a real verifier and subject", () => {
    for (const v of SEEDED_VERIFICATIONS) {
      expect(orgIds.has(v.org), v.org).toBe(true);
      expect(personIds.has(v.subject), v.subject).toBe(true);
      const org = ORGS.find((o) => o.id === v.org)!;
      expect(org.roles, `${org.name} must be a verifier`).toContain("verifier");
    }
  });

  /**
   * The seeder turns each of these into a real request. A phrasing that the
   * interpreter reads as "clarification" or "unsupported" cannot be turned
   * into one, which used to abort the whole seed — and with it, sign-up.
   */
  it("every seeded verification interprets into an actionable request", () => {
    for (const v of SEEDED_VERIFICATIONS) {
      const structured = interpretLocally(v.text);
      expect(["predicate", "full_history", "identity", "raw_value"], `${v.text} -> ${structured.kind}`).toContain(
        structured.kind,
      );
    }
  });

  it("covers the full range of outcomes a presenter may be asked about", () => {
    const provRate = (c: { values: Record<string, number> }) =>
      c.values.bookings_accepted ? c.values.completed_bookings / c.values.bookings_accepted : null;
    const rates = PEOPLE.flatMap((p) => p.credentials.map(provRate)).filter((r): r is number => r !== null);
    expect(rates.some((r) => r === 0), "a provider who completes nothing").toBe(true);
    expect(rates.some((r) => r > 0 && r <= 0.15), "a provider around 10%").toBe(true);
    expect(rates.some((r) => r > 0.45 && r < 0.55), "a provider at 50%").toBe(true);
    expect(rates.some((r) => r === 1), "a provider at 100%").toBe(true);
    expect(PEOPLE.some((p) => p.credentials.length === 0), "somebody with no history at all").toBe(true);
    expect(PEOPLE.some((p) => p.credentials.some((c) => c.revokedBy === "issuer")), "an issuer revocation").toBe(true);
    expect(PEOPLE.some((p) => p.credentials.some((c) => c.revokedBy === "holder")), "a holder revocation").toBe(true);
    expect(SEEDED_VERIFICATIONS.some((v) => v.holder === "pending"), "an unanswered request").toBe(true);
    expect(SEEDED_VERIFICATIONS.some((v) => v.holder === "decline"), "a declined request").toBe(true);
    expect(ORGS.some((o) => !o.registered), "an unregistered verifier").toBe(true);
  });
});
