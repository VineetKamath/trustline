import { ristretto255, ristretto255_hasher } from "@noble/curves/ed25519.js";
import {
  bigIntToHexLE,
  bytesToBigIntLE,
  canonicalize,
  hexLEToBigInt,
  randomBytes,
  sha512Bytes,
  utf8ToBytes,
} from "./encoding";

/**
 * Pedersen commitments over the ristretto255 prime-order group.
 *
 *   C = v·G + r·H
 *
 * G is the standard base point. H is derived by hashing to the curve, so
 * nobody knows log_G(H); commitments are therefore perfectly hiding and
 * computationally binding.
 */

const Point = ristretto255.Point;
export type GroupPoint = InstanceType<typeof Point>;

export const ORDER: bigint = Point.Fn.ORDER;
export const G: GroupPoint = Point.BASE;
export const H: GroupPoint = ristretto255_hasher.hashToCurve(utf8ToBytes("TRUSTLINE/pedersen/generator-H"), {
  DST: "TRUSTLINE-V1-PEDERSEN-H",
}) as GroupPoint;

export function mod(value: bigint): bigint {
  const r = value % ORDER;
  return r >= 0n ? r : r + ORDER;
}

export function invert(value: bigint): bigint {
  return Point.Fn.inv(mod(value));
}

/** Scalar multiplication that accepts zero and negative scalars. */
export function mul(point: GroupPoint, scalar: bigint): GroupPoint {
  const k = mod(scalar);
  if (k === 0n) return Point.ZERO;
  return point.multiply(k);
}

export function randomScalar(): bigint {
  return mod(bytesToBigIntLE(randomBytes(64)));
}

export function commit(value: bigint, blinding: bigint): GroupPoint {
  return mul(G, value).add(mul(H, blinding));
}

export function pointToHex(point: GroupPoint): string {
  return point.toHex();
}

export function pointFromHex(hex: string): GroupPoint {
  return Point.fromHex(hex) as GroupPoint;
}

export const scalarToHex = (s: bigint) => bigIntToHexLE(mod(s));
export const scalarFromHex = (hex: string) => mod(hexLEToBigInt(hex));

/** Fiat–Shamir challenge: a uniform scalar derived from a transcript. */
export function hashToScalar(transcript: unknown): bigint {
  return mod(bytesToBigIntLE(sha512Bytes(canonicalize(transcript))));
}

export function pointsEqual(a: GroupPoint, b: GroupPoint): boolean {
  return a.equals(b);
}
