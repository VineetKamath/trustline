import fs from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { interpretLocally } from "@/lib/aws/strands/localInterpreter";
import { buyerContext, sellerContext, type CredentialValues } from "@/lib/reputation/engine";
import { structuredRequestSchema, trustlineIdSchema } from "@/lib/validation/schemas";

const cred = (credentialType: string, values: Record<string, number>, status: "ACTIVE" | "REVOKED" = "ACTIVE"): CredentialValues => ({
  credentialId: Math.random().toString(36),
  credentialType,
  issuerName: "Issuer",
  status,
  values,
});

describe("reputation engine", () => {
  const market = cred("MARKETPLACE_REPUTATION", {
    successful_transactions: 47,
    bookings_total: 52,
    cancellations: 3,
    no_shows: 2,
    payments_completed: 47,
    disputes: 0,
    seller_orders_accepted: 38,
    seller_orders_completed: 37,
    seller_positive_outcomes: 36,
    seller_disputes: 1,
  });
  const freelance = cred("FREELANCE_RECORD", { completed_projects: 12, projects_accepted: 12, positive_outcomes: 12 });

  it("calculates buyer metrics transparently", () => {
    const b = buyerContext([market]);
    expect(b.metrics.map((m) => m.value)).toEqual([96, 100, 94]);
    expect(b.metrics[0].inputs).toEqual([
      { label: "Completed", value: 47 },
      { label: "No-shows", value: 2 },
    ]);
    expect(b.totals.map((t) => t.value)).toEqual([47, 3, 2, 0]);
  });

  it("combines seller evidence across platforms", () => {
    const s = sellerContext([market, freelance]);
    expect(s.metrics.map((m) => m.display)).toEqual(["98%", "96%", "Low"]);
  });

  it("ignores revoked credentials", () => {
    const b = buyerContext([{ ...market, status: "REVOKED" }]);
    expect(b.metrics[0].value).toBeNull();
    expect(b.metrics[0].display).toBe("—");
  });
});

describe("request interpreter (Strands contract, local mode)", () => {
  it("maps threshold questions to predicates", () => {
    expect(interpretLocally("Does this buyer have at least 20 successful bookings?")).toMatchObject({
      kind: "predicate",
      claim: "successful_transactions",
      operator: ">=",
      threshold: 20,
      purpose: "buyer_verification",
    });
    expect(interpretLocally("I need to know if this seller has at least 20 successful transactions.")).toMatchObject({
      claim: "successful_transactions",
      threshold: 20,
      purpose: "seller_verification",
    });
    expect(interpretLocally("more than 9 completed stays")).toMatchObject({ claim: "completed_stays", threshold: 10 });
    expect(interpretLocally("Is the seller completion rate at least 95%?")).toMatchObject({ claim: "seller_completion_pct", threshold: 95 });
  });

  it("reports over-broad requests faithfully instead of narrowing them", () => {
    expect(interpretLocally("Give me the seller's complete transaction history.").kind).toBe("full_history");
    expect(interpretLocally("What is the buyer's phone number?").kind).toBe("identity");
    expect(interpretLocally("Exactly how many transactions has this buyer done?").kind).toBe("raw_value");
  });

  it("asks for verifiable facts instead of scoring vague questions", () => {
    const r = interpretLocally("Is this seller trustworthy?");
    expect(r.kind).toBe("clarification");
    expect(r.suggestions?.length).toBeGreaterThanOrEqual(2);
    expect(JSON.stringify(r)).not.toMatch(/score|confidence/i);
  });

  it("always produces schema-valid output", () => {
    for (const q of ["hello", "Is this seller trustworthy?", "at least 5 projects", "Give me all orders"]) {
      expect(structuredRequestSchema.safeParse(interpretLocally(q)).success).toBe(true);
    }
  });
});

describe("validation", () => {
  it("normalises and validates Trustline IDs", () => {
    expect(trustlineIdSchema.parse(" tl-7f4a ")).toBe("TL-7F4A");
    expect(trustlineIdSchema.safeParse("TL-7F4A; DROP").success).toBe(false);
  });
});

describe("exported Cedar files for Amazon Verified Permissions", () => {
  it("parse as valid Cedar", () => {
    const require = createRequire(import.meta.url);
    const cedar = require("@cedar-policy/cedar-wasm/nodejs");
    const dir = "infra/cedar/policies";
    for (const f of fs.readdirSync(dir)) {
      const r = cedar.checkParsePolicySet({ staticPolicies: fs.readFileSync(`${dir}/${f}`, "utf8") });
      expect(r.type, f).toBe("success");
    }
    expect(cedar.checkParseSchema(fs.readFileSync("infra/cedar/schema.cedarschema", "utf8")).type).toBe("success");
  });
});
