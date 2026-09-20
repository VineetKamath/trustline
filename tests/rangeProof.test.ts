import { describe, expect, it } from "vitest";
import { commit, G, mul, randomScalar } from "@/lib/crypto/pedersen";
import { proveNonNegative, verifyNonNegative } from "@/lib/crypto/rangeProof";

describe("zero-knowledge range proof", () => {
  it("proves value - threshold >= 0 without the value", () => {
    const r = randomScalar();
    const C = commit(47n, r);
    const D = C.subtract(mul(G, 20n));
    const proof = proveNonNegative(27n, r, "ctx");
    expect(verifyNonNegative(D, proof, "ctx")).toBe(true);
    expect(verifyNonNegative(D, proof, "other-ctx")).toBe(false);
    expect(verifyNonNegative(C.subtract(mul(G, 48n)), proof, "ctx")).toBe(false);
    expect(JSON.stringify(proof)).not.toMatch(/"47"|"27"/);
  });
  it("refuses to prove a false statement", () => {
    expect(() => proveNonNegative(-1n, 1n, "ctx")).toThrow();
  });
});
