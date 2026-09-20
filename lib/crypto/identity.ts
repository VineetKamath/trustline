import { subjectCommitmentFor } from "@/contracts/trustline-chaincode/src/logic";
import { randomHex, sha256Hex } from "./encoding";
import { chaincodeCrypto } from "./signatures";

/**
 * Trustline identity is a holder key pair, never the application login.
 * The human-friendly Trustline ID ("TL-7F4A") is a short fingerprint of the
 * holder's public key and is resolved through the Trustline directory.
 */
export function deriveTrustlineId(holderPublicKey: string): string {
  return `TL-${sha256Hex(`trustline-id:v1:${holderPublicKey}`).slice(0, 4).toUpperCase()}`;
}

export const TRUSTLINE_ID_PATTERN = /^TL-[0-9A-F]{4}$/;

export function newSubjectSalt(): string {
  return randomHex(16);
}

/** Pairwise, per-credential binding of a credential to a holder key. */
export function subjectCommitment(holderPublicKey: string, subjectSalt: string): string {
  return subjectCommitmentFor(chaincodeCrypto, holderPublicKey, subjectSalt);
}
