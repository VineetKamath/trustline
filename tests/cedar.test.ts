import { describe, expect, it } from "vitest";
import { LocalCedarEngine, validatePolicies } from "@/lib/aws/cedar/localEngine";
import { entity, ref } from "@/lib/aws/cedar/engine";

const engine = new LocalCedarEngine();
const verifier = (registered: boolean) => ({
  uid: ref("Verifier", "ver_b"),
  attrs: { registered, allowedPurposes: ["buyer_verification", "seller_verification"] },
  parents: [],
});
const claim = { uid: ref("Claim", "successful_transactions"), attrs: { supported: true, unit: "count" }, parents: [] };

describe("cedar", () => {
  it("policies validate against schema", () => {
    const r = validatePolicies();
    expect(r).toMatchObject({ type: "success", validationErrors: [] });
  });
  it("allows minimum-disclosure predicate", async () => {
    const d = await engine.authorize({
      principal: ref("Verifier", "ver_b"), action: "RequestPredicateProof", resource: ref("Claim", "successful_transactions"),
      context: { operator: ">=", threshold: 20, purpose: "buyer_verification", disclosure: "predicate_result_only" },
      entities: [verifier(true), claim],
    });
    expect(d.decision).toBe("ALLOW");
    expect(d.determiningPolicies).toEqual(["verifier-minimum-disclosure-proof"]);
  });
  it("denies full history", async () => {
    const d = await engine.authorize({
      principal: ref("Verifier", "ver_b"), action: "RequestFullHistory", resource: ref("Claim", "successful_transactions"),
      context: { purpose: "buyer_verification", disclosure: "full_history" },
      entities: [verifier(true), claim],
    });
    expect(d.decision).toBe("DENY");
    expect(d.determiningPolicies).toContain("forbid-full-history");
  });
  it("denies unregistered verifier", async () => {
    const d = await engine.authorize({
      principal: ref("Verifier", "ver_b"), action: "RequestPredicateProof", resource: ref("Claim", "successful_transactions"),
      context: { operator: ">=", threshold: 20, purpose: "buyer_verification", disclosure: "predicate_result_only" },
      entities: [verifier(false), claim],
    });
    expect(d.decision).toBe("DENY");
  });
  it("issuer type check with entity set", async () => {
    const d = await engine.authorize({
      principal: ref("Issuer", "iss_a"), action: "IssueCredential", resource: ref("CredentialType", "MARKETPLACE_REPUTATION"),
      context: {},
      entities: [{ uid: ref("Issuer", "iss_a"), attrs: { registered: true, allowedCredentialTypes: [entity("CredentialType", "MARKETPLACE_REPUTATION")] }, parents: [] }],
    });
    expect(d.decision).toBe("ALLOW");
  });
});
