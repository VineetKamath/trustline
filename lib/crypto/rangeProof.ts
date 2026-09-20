import {
  G,
  H,
  commit,
  hashToScalar,
  invert,
  mod,
  mul,
  pointFromHex,
  pointToHex,
  randomScalar,
  scalarFromHex,
  scalarToHex,
  type GroupPoint,
} from "./pedersen";

/**
 * Non-interactive zero-knowledge proof that a Pedersen commitment
 *
 *   D = d·G + r·H
 *
 * opens to a value 0 ≤ d < 2^bits, without revealing d or r.
 *
 * Construction (bit decomposition):
 *   1. Split d into bits b_i and commit to each: C_i = b_i·G + r_i·H, with the
 *      r_i chosen so that Σ 2^i·r_i = r. The verifier checks Σ 2^i·C_i = D.
 *   2. For every C_i, prove "C_i commits to 0 OR C_i commits to 1" with a
 *      Cramer–Damgård–Schoenmakers OR-composition of two Schnorr proofs of
 *      knowledge of log_H, made non-interactive with Fiat–Shamir.
 *
 * Threshold claims (value ≥ t) and ratio claims (100·a − p·b ≥ 0) are reduced
 * to this primitive by homomorphically combining attribute commitments.
 */

export const RANGE_BITS = 24;

export interface BitProof {
  commitment: string;
  e0: string;
  s0: string;
  e1: string;
  s1: string;
}

export interface RangeProof {
  scheme: "trustline-bitdecomp-cds-ristretto255-v1";
  bits: number;
  bitProofs: BitProof[];
}

function bitChallenge(context: string, index: number, commitment: GroupPoint, a0: GroupPoint, a1: GroupPoint) {
  return hashToScalar({
    domain: "trustline:range-bit:v1",
    context,
    index,
    commitment: pointToHex(commitment),
    a0: pointToHex(a0),
    a1: pointToHex(a1),
  });
}

export class RangeProofError extends Error {}

/**
 * @param value  the private value d (must satisfy 0 ≤ d < 2^bits)
 * @param blinding the blinding factor r of D
 * @param context a transcript string binding the proof to its statement
 */
export function proveNonNegative(value: bigint, blinding: bigint, context: string, bits = RANGE_BITS): RangeProof {
  if (value < 0n || value >= 1n << BigInt(bits)) {
    throw new RangeProofError("value is outside the provable range");
  }

  // Blinding factors for each bit, constrained so Σ 2^i·r_i = r.
  const blindings: bigint[] = [];
  let weighted = 0n;
  for (let i = 0; i < bits - 1; i++) {
    const ri = randomScalar();
    blindings.push(ri);
    weighted = mod(weighted + (ri << BigInt(i)));
  }
  blindings.push(mod((blinding - weighted) * invert(1n << BigInt(bits - 1))));

  const bitProofs: BitProof[] = [];
  for (let i = 0; i < bits; i++) {
    const bit = (value >> BigInt(i)) & 1n;
    const ri = blindings[i];
    const Ci = commit(bit, ri);
    const Y0 = Ci;
    const Y1 = Ci.subtract(G);
    const k = randomScalar();

    let e0: bigint, s0: bigint, e1: bigint, s1: bigint;
    if (bit === 0n) {
      // Real proof for Y0 = ri·H, simulated proof for Y1.
      e1 = randomScalar();
      s1 = randomScalar();
      const A0 = mul(H, k);
      const A1 = mul(H, s1).subtract(mul(Y1, e1));
      const e = bitChallenge(context, i, Ci, A0, A1);
      e0 = mod(e - e1);
      s0 = mod(k + e0 * ri);
    } else {
      e0 = randomScalar();
      s0 = randomScalar();
      const A1 = mul(H, k);
      const A0 = mul(H, s0).subtract(mul(Y0, e0));
      const e = bitChallenge(context, i, Ci, A0, A1);
      e1 = mod(e - e0);
      s1 = mod(k + e1 * ri);
    }
    bitProofs.push({
      commitment: pointToHex(Ci),
      e0: scalarToHex(e0),
      s0: scalarToHex(s0),
      e1: scalarToHex(e1),
      s1: scalarToHex(s1),
    });
  }

  return { scheme: "trustline-bitdecomp-cds-ristretto255-v1", bits, bitProofs };
}

export function verifyNonNegative(D: GroupPoint, proof: RangeProof, context: string): boolean {
  try {
    if (proof.scheme !== "trustline-bitdecomp-cds-ristretto255-v1") return false;
    if (!Number.isInteger(proof.bits) || proof.bits < 1 || proof.bits > 32) return false;
    if (proof.bitProofs.length !== proof.bits) return false;

    let sum: GroupPoint | null = null;
    for (let i = 0; i < proof.bits; i++) {
      const bp = proof.bitProofs[i];
      const Ci = pointFromHex(bp.commitment);
      const e0 = scalarFromHex(bp.e0);
      const s0 = scalarFromHex(bp.s0);
      const e1 = scalarFromHex(bp.e1);
      const s1 = scalarFromHex(bp.s1);
      const Y0 = Ci;
      const Y1 = Ci.subtract(G);
      const A0 = mul(H, s0).subtract(mul(Y0, e0));
      const A1 = mul(H, s1).subtract(mul(Y1, e1));
      const e = bitChallenge(context, i, Ci, A0, A1);
      if (mod(e0 + e1) !== e) return false;
      const term = mul(Ci, 1n << BigInt(i));
      sum = sum ? sum.add(term) : term;
    }
    return sum !== null && sum.equals(D);
  } catch {
    return false;
  }
}
