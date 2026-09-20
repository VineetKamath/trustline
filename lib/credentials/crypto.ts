import { credentialSigningMessage } from "@/contracts/trustline-chaincode/src/logic";
import type { CredentialSigningPayload } from "@/contracts/trustline-chaincode/src/types";
import { canonicalize, sha256Hex } from "@/lib/crypto/encoding";
import { deriveTrustlineId, newSubjectSalt, subjectCommitment } from "@/lib/crypto/identity";
import {
  G,
  commit,
  mod,
  mul,
  pointFromHex,
  pointToHex,
  randomScalar,
  scalarFromHex,
  scalarToHex,
  type GroupPoint,
} from "@/lib/crypto/pedersen";
import { RangeProofError, proveNonNegative, verifyNonNegative } from "@/lib/crypto/rangeProof";
import { signMessage, verifyMessage } from "@/lib/crypto/signatures";
import { CLAIMS, claimLabel } from "./claims";
import { getSchema } from "./schemas";
import type { AttributeOpening, ClaimKey, Presentation } from "@/types";

// ── Issuance ────────────────────────────────────────────────────────────────

export function claimRoot(credentialType: string, attributeCommitments: Record<string, string>): string {
  return sha256Hex(
    canonicalize({ domain: "trustline:claims:v1", credentialType, commitments: attributeCommitments }),
  );
}

export interface BuiltCredential {
  ledgerRecord: CredentialSigningPayload & { issuerSignature: string };
  attributeCommitments: Record<string, string>;
  openings: Record<string, AttributeOpening>;
  subjectSalt: string;
}

/**
 * Builds and signs a credential. Only commitments and hashes leave this
 * function towards the ledger; the plaintext values and blinding factors
 * (the "openings") are returned for delivery to the holder's wallet only.
 */
export function buildCredential(input: {
  credentialId: string;
  issuerId: string;
  issuerSecretKey: string;
  holderPublicKey: string;
  credentialType: string;
  values: Record<string, number>;
  issuedAt: string;
}): BuiltCredential {
  const schema = getSchema(input.credentialType);
  const openings: Record<string, AttributeOpening> = {};
  const attributeCommitments: Record<string, string> = {};
  for (const { key } of schema.attributes) {
    const value = input.values[key] ?? 0;
    if (!Number.isInteger(value) || value < 0 || value > 1_000_000) {
      throw new Error(`Attribute ${key} must be a non-negative integer`);
    }
    const blinding = randomScalar();
    openings[key] = { value, blinding: scalarToHex(blinding) };
    attributeCommitments[key] = pointToHex(commit(BigInt(value), blinding));
  }

  const subjectSalt = newSubjectSalt();
  const payload: CredentialSigningPayload = {
    credentialId: input.credentialId,
    issuerId: input.issuerId,
    subjectCommitment: subjectCommitment(input.holderPublicKey, subjectSalt),
    credentialType: input.credentialType,
    claimCommitment: claimRoot(input.credentialType, attributeCommitments),
    issuedAt: input.issuedAt,
  };
  const issuerSignature = signMessage(input.issuerSecretKey, credentialSigningMessage(payload));
  return { ledgerRecord: { ...payload, issuerSignature }, attributeCommitments, openings, subjectSalt };
}

// ── Presentation (holder) ──────────────────────────────────────────────────

export function presentationContext(p: {
  requestId: string;
  nonce: string;
  credentialId: string;
  claimCommitment: string;
  coefficients: Record<string, number>;
  threshold: number;
}): string {
  return canonicalize({ domain: "trustline:presentation:v1", ...p });
}

function holderBindingMessage(p: { requestId: string; nonce: string; credentialId: string; trustlineId: string }) {
  return canonicalize({ domain: "trustline:holder-binding:v1", ...p });
}

export class PredicateNotSatisfiedError extends Error {
  constructor() {
    super("The private value does not satisfy the requested claim");
  }
}

export function createPresentation(input: {
  requestId: string;
  nonce: string;
  credential: {
    credentialId: string;
    issuerId: string;
    credentialType: string;
    claimCommitment: string;
    attributeCommitments: Record<string, string>;
  };
  openings: Record<string, AttributeOpening>;
  subjectSalt: string;
  holder: { trustlineId: string; publicKey: string; secretKey: string };
  claim: ClaimKey;
  threshold: number;
}): Presentation {
  const definition = CLAIMS[input.claim];
  const predicate = definition.predicate(input.threshold);

  let value = 0n;
  let blinding = 0n;
  for (const [attr, coefficient] of Object.entries(predicate.coefficients)) {
    const opening = input.openings[attr];
    if (!opening) throw new Error(`Credential has no attribute ${attr}`);
    value += BigInt(coefficient) * BigInt(opening.value);
    blinding = mod(blinding + BigInt(coefficient) * scalarFromHex(opening.blinding));
  }
  const slack = value - BigInt(predicate.threshold);

  const context = presentationContext({
    requestId: input.requestId,
    nonce: input.nonce,
    credentialId: input.credential.credentialId,
    claimCommitment: input.credential.claimCommitment,
    coefficients: predicate.coefficients,
    threshold: predicate.threshold,
  });

  let proof;
  try {
    proof = proveNonNegative(slack, blinding, context);
  } catch (error) {
    if (error instanceof RangeProofError) throw new PredicateNotSatisfiedError();
    throw error;
  }

  const bindingMessage = holderBindingMessage({
    requestId: input.requestId,
    nonce: input.nonce,
    credentialId: input.credential.credentialId,
    trustlineId: input.holder.trustlineId,
  });

  return {
    version: "trustline-presentation-v1",
    requestId: input.requestId,
    nonce: input.nonce,
    credentialId: input.credential.credentialId,
    issuerId: input.credential.issuerId,
    credentialType: input.credential.credentialType,
    claimCommitment: input.credential.claimCommitment,
    attributeCommitments: input.credential.attributeCommitments,
    predicate: {
      claim: input.claim,
      label: claimLabel(input.claim, input.threshold),
      coefficients: predicate.coefficients,
      threshold: predicate.threshold,
    },
    holderBinding: {
      trustlineId: input.holder.trustlineId,
      holderPublicKey: input.holder.publicKey,
      subjectSalt: input.subjectSalt,
      signature: signMessage(input.holder.secretKey, bindingMessage),
    },
    proof,
  };
}

// ── Presentation verification (verifier) ───────────────────────────────────

export interface PresentationCheck {
  commitmentMatchesLedger: boolean;
  holderBindingValid: boolean;
  predicateMatchesRequest: boolean;
  proofValid: boolean;
}

/**
 * Everything a verifier needs is in the presentation plus the public ledger
 * record. No plaintext value is available — or required — at this point.
 */
export function verifyPresentation(
  presentation: Presentation,
  expected: {
    requestId: string;
    nonce: string;
    trustlineId: string;
    claim: ClaimKey;
    threshold: number;
    ledger: { claimCommitment: string; subjectCommitment: string; credentialType: string };
  },
): PresentationCheck {
  const expectedPredicate = CLAIMS[expected.claim].predicate(expected.threshold);
  const predicateMatchesRequest =
    presentation.requestId === expected.requestId &&
    presentation.nonce === expected.nonce &&
    presentation.predicate.claim === expected.claim &&
    presentation.predicate.threshold === expectedPredicate.threshold &&
    canonicalize(presentation.predicate.coefficients) === canonicalize(expectedPredicate.coefficients) &&
    CLAIMS[expected.claim].credentialTypes.includes(expected.ledger.credentialType);

  const commitmentMatchesLedger =
    presentation.claimCommitment === expected.ledger.claimCommitment &&
    claimRoot(expected.ledger.credentialType, presentation.attributeCommitments) === expected.ledger.claimCommitment;

  const hb = presentation.holderBinding;
  const holderBindingValid =
    hb.trustlineId === expected.trustlineId &&
    deriveTrustlineId(hb.holderPublicKey) === expected.trustlineId &&
    subjectCommitment(hb.holderPublicKey, hb.subjectSalt) === expected.ledger.subjectCommitment &&
    verifyMessage(
      hb.holderPublicKey,
      holderBindingMessage({
        requestId: presentation.requestId,
        nonce: presentation.nonce,
        credentialId: presentation.credentialId,
        trustlineId: hb.trustlineId,
      }),
      hb.signature,
    );

  let proofValid = false;
  if (predicateMatchesRequest && commitmentMatchesLedger) {
    try {
      let D: GroupPoint = mul(G, -BigInt(expectedPredicate.threshold));
      for (const [attr, coefficient] of Object.entries(expectedPredicate.coefficients)) {
        const C = presentation.attributeCommitments[attr];
        if (!C) throw new Error("missing commitment");
        D = D.add(mul(pointFromHex(C), BigInt(coefficient)));
      }
      const context = presentationContext({
        requestId: presentation.requestId,
        nonce: presentation.nonce,
        credentialId: presentation.credentialId,
        claimCommitment: presentation.claimCommitment,
        coefficients: expectedPredicate.coefficients,
        threshold: expectedPredicate.threshold,
      });
      proofValid = verifyNonNegative(D, presentation.proof, context);
    } catch {
      proofValid = false;
    }
  }

  return { commitmentMatchesLedger, holderBindingValid, predicateMatchesRequest, proofValid };
}
