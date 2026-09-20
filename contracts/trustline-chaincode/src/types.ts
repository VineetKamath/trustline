/**
 * Public ledger records. Everything in this file is written to the shared
 * ledger and is readable by every network member, so it must never contain
 * personal data, plaintext claim values, or transaction history.
 */

export type LedgerCredentialStatus = "ACTIVE" | "REVOKED";

export interface LedgerIssuer {
  docType: "issuer";
  issuerId: string;
  name: string;
  /** Ed25519 public key (hex) used to verify credential signatures. */
  publicKey: string;
  credentialTypes: string[];
  registeredAt: string;
  status: "ACTIVE" | "SUSPENDED";
}

/** The fields an issuer signs when it issues a credential. */
export interface CredentialSigningPayload {
  credentialId: string;
  issuerId: string;
  /** sha256(holderPublicKey ‖ salt) — unlinkable without the salt. */
  subjectCommitment: string;
  credentialType: string;
  /** Root hash over the Pedersen commitments of every credential attribute. */
  claimCommitment: string;
  issuedAt: string;
}

export interface LedgerCredential extends CredentialSigningPayload {
  docType: "credential";
  issuerSignature: string;
  status: LedgerCredentialStatus;
  revokedAt?: string;
  revocationReason?: RevocationReason;
  revokedBy?: "issuer" | "holder";
}

export type RevocationReason =
  | "ISSUER_CORRECTION"
  | "HOLDER_WITHDRAWN"
  | "SUPERSEDED"
  | "PLATFORM_POLICY";

export const REVOCATION_REASONS: RevocationReason[] = [
  "ISSUER_CORRECTION",
  "HOLDER_WITHDRAWN",
  "SUPERSEDED",
  "PLATFORM_POLICY",
];

export interface RevocationSigningPayload {
  action: "REVOKE";
  credentialId: string;
  reason: RevocationReason;
  revokedAt: string;
}

export type RevocationAuthorization =
  | { by: "issuer"; signature: string }
  | {
      by: "holder";
      holderPublicKey: string;
      subjectSalt: string;
      signature: string;
    };

export interface RevocationRequest extends RevocationSigningPayload {
  authorization: RevocationAuthorization;
}

export interface CredentialVerification {
  credentialId: string;
  found: boolean;
  status: LedgerCredentialStatus | "NOT_FOUND";
  issuerRegistered: boolean;
  issuerSignatureValid: boolean;
  claimCommitmentMatches: boolean;
  valid: boolean;
  issuerId?: string;
  issuedAt?: string;
  revokedAt?: string;
}

/** The only keys a credential record may carry on-chain. */
export const LEDGER_CREDENTIAL_KEYS = [
  "credentialId",
  "issuerId",
  "subjectCommitment",
  "credentialType",
  "claimCommitment",
  "issuedAt",
  "issuerSignature",
] as const;
