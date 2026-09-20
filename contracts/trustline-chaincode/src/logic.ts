import { canonicalize } from "./canonical";
import {
  LEDGER_CREDENTIAL_KEYS,
  REVOCATION_REASONS,
  type CredentialSigningPayload,
  type CredentialVerification,
  type LedgerCredential,
  type LedgerIssuer,
  type RevocationRequest,
  type RevocationSigningPayload,
} from "./types";

/**
 * Trustline chaincode business logic.
 *
 * This module is deliberately free of any Fabric or Node dependency so that
 * exactly the same rules run in two places:
 *   - inside Hyperledger Fabric (see contract.ts, which adapts ctx.stub), and
 *   - inside the local deterministic ledger used for development and demos.
 */

export interface WorldState {
  get(key: string): Promise<string | undefined>;
  put(key: string, value: string): Promise<void>;
}

export interface ChaincodeCrypto {
  verifyEd25519(publicKeyHex: string, message: string, signatureHex: string): boolean;
  sha256Hex(message: string): string;
}

export class ChaincodeError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ChaincodeError";
  }
}

const HEX64 = /^[0-9a-f]{64}$/;
const HEX128 = /^[0-9a-f]{128}$/;
const ID = /^[A-Za-z0-9_:.-]{3,96}$/;
const TYPE = /^[A-Z][A-Z0-9_]{2,63}$/;

export const issuerKey = (issuerId: string) => `ISSUER~${issuerId}`;
export const credentialKey = (credentialId: string) => `CRED~${credentialId}`;

/** sha256 binding of a credential to a holder key without revealing the key. */
export function subjectCommitmentFor(
  crypto: ChaincodeCrypto,
  holderPublicKey: string,
  subjectSalt: string,
): string {
  return crypto.sha256Hex(`trustline:subject:v1:${holderPublicKey}:${subjectSalt}`);
}

export function credentialSigningMessage(p: CredentialSigningPayload): string {
  return canonicalize({
    domain: "trustline:credential:v1",
    credentialId: p.credentialId,
    issuerId: p.issuerId,
    subjectCommitment: p.subjectCommitment,
    credentialType: p.credentialType,
    claimCommitment: p.claimCommitment,
    issuedAt: p.issuedAt,
  });
}

export function revocationSigningMessage(p: RevocationSigningPayload): string {
  return canonicalize({
    domain: "trustline:revocation:v1",
    action: p.action,
    credentialId: p.credentialId,
    reason: p.reason,
    revokedAt: p.revokedAt,
  });
}

function assert(condition: unknown, code: string, message: string): asserts condition {
  if (!condition) throw new ChaincodeError(code, message);
}

function isIsoDate(value: string) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) && value.length <= 40;
}

export class TrustlineChaincode {
  constructor(
    private readonly state: WorldState,
    private readonly crypto: ChaincodeCrypto,
  ) {}

  async registerIssuer(input: {
    issuerId: string;
    name: string;
    publicKey: string;
    credentialTypes: string[];
    registeredAt: string;
  }): Promise<LedgerIssuer> {
    assert(ID.test(input.issuerId), "INVALID_ISSUER_ID", "issuerId is malformed");
    assert(
      typeof input.name === "string" && input.name.length > 0 && input.name.length <= 80,
      "INVALID_NAME",
      "issuer name is malformed",
    );
    assert(HEX64.test(input.publicKey), "INVALID_KEY", "issuer public key must be 32-byte hex");
    assert(
      Array.isArray(input.credentialTypes) &&
        input.credentialTypes.length > 0 &&
        input.credentialTypes.every((t) => TYPE.test(t)),
      "INVALID_TYPES",
      "credentialTypes are malformed",
    );
    assert(isIsoDate(input.registeredAt), "INVALID_DATE", "registeredAt must be an ISO date");
    const existing = await this.state.get(issuerKey(input.issuerId));
    assert(!existing, "ISSUER_EXISTS", `issuer ${input.issuerId} is already registered`);

    const issuer: LedgerIssuer = {
      docType: "issuer",
      issuerId: input.issuerId,
      name: input.name,
      publicKey: input.publicKey,
      credentialTypes: [...input.credentialTypes].sort(),
      registeredAt: input.registeredAt,
      status: "ACTIVE",
    };
    await this.state.put(issuerKey(issuer.issuerId), canonicalize(issuer));
    return issuer;
  }

  async getIssuer(issuerId: string): Promise<LedgerIssuer | null> {
    const raw = await this.state.get(issuerKey(issuerId));
    return raw ? (JSON.parse(raw) as LedgerIssuer) : null;
  }

  async issueCredential(record: CredentialSigningPayload & { issuerSignature: string }): Promise<LedgerCredential> {
    // Privacy guard: the ledger only accepts the whitelisted public fields.
    const extraKeys = Object.keys(record).filter(
      (k) => !(LEDGER_CREDENTIAL_KEYS as readonly string[]).includes(k),
    );
    assert(
      extraKeys.length === 0,
      "FIELD_NOT_ALLOWED",
      `credential contains fields that may not be stored on-chain: ${extraKeys.join(", ")}`,
    );
    assert(ID.test(record.credentialId), "INVALID_CREDENTIAL_ID", "credentialId is malformed");
    assert(HEX64.test(record.subjectCommitment), "INVALID_SUBJECT", "subjectCommitment must be a sha256 hash");
    assert(HEX64.test(record.claimCommitment), "INVALID_CLAIM", "claimCommitment must be a sha256 hash");
    assert(TYPE.test(record.credentialType), "INVALID_TYPE", "credentialType is malformed");
    assert(isIsoDate(record.issuedAt), "INVALID_DATE", "issuedAt must be an ISO date");
    assert(HEX128.test(record.issuerSignature), "INVALID_SIGNATURE", "issuerSignature must be 64-byte hex");

    const issuer = await this.getIssuer(record.issuerId);
    assert(issuer, "UNKNOWN_ISSUER", `issuer ${record.issuerId} is not registered`);
    assert(issuer.status === "ACTIVE", "ISSUER_SUSPENDED", "issuer is not active");
    assert(
      issuer.credentialTypes.includes(record.credentialType),
      "TYPE_NOT_ALLOWED",
      `issuer may not issue ${record.credentialType}`,
    );
    const existing = await this.state.get(credentialKey(record.credentialId));
    assert(!existing, "CREDENTIAL_EXISTS", "credentialId already exists");

    const signatureValid = this.crypto.verifyEd25519(
      issuer.publicKey,
      credentialSigningMessage(record),
      record.issuerSignature,
    );
    assert(signatureValid, "BAD_SIGNATURE", "issuer signature does not verify");

    const credential: LedgerCredential = {
      docType: "credential",
      credentialId: record.credentialId,
      issuerId: record.issuerId,
      subjectCommitment: record.subjectCommitment,
      credentialType: record.credentialType,
      claimCommitment: record.claimCommitment,
      issuedAt: record.issuedAt,
      issuerSignature: record.issuerSignature,
      status: "ACTIVE",
    };
    await this.state.put(credentialKey(credential.credentialId), canonicalize(credential));
    return credential;
  }

  async getCredential(credentialId: string): Promise<LedgerCredential | null> {
    const raw = await this.state.get(credentialKey(credentialId));
    return raw ? (JSON.parse(raw) as LedgerCredential) : null;
  }

  async getCredentialStatus(credentialId: string) {
    const credential = await this.getCredential(credentialId);
    if (!credential) return { credentialId, status: "NOT_FOUND" as const };
    return {
      credentialId,
      status: credential.status,
      issuerId: credential.issuerId,
      issuedAt: credential.issuedAt,
      revokedAt: credential.revokedAt,
      revocationReason: credential.revocationReason,
    };
  }

  /**
   * Verifies ledger-level integrity of a credential: it exists, is active, was
   * signed by a registered issuer, and (optionally) that a presented claim
   * commitment matches the one anchored on-chain.
   */
  async verifyCredential(credentialId: string, claimCommitment?: string): Promise<CredentialVerification> {
    const credential = await this.getCredential(credentialId);
    if (!credential) {
      return {
        credentialId,
        found: false,
        status: "NOT_FOUND",
        issuerRegistered: false,
        issuerSignatureValid: false,
        claimCommitmentMatches: false,
        valid: false,
      };
    }
    const issuer = await this.getIssuer(credential.issuerId);
    const issuerRegistered = Boolean(issuer && issuer.status === "ACTIVE");
    const issuerSignatureValid = Boolean(
      issuer &&
        this.crypto.verifyEd25519(issuer.publicKey, credentialSigningMessage(credential), credential.issuerSignature),
    );
    const claimCommitmentMatches = claimCommitment === undefined || claimCommitment === credential.claimCommitment;
    return {
      credentialId,
      found: true,
      status: credential.status,
      issuerRegistered,
      issuerSignatureValid,
      claimCommitmentMatches,
      valid: credential.status === "ACTIVE" && issuerRegistered && issuerSignatureValid && claimCommitmentMatches,
      issuerId: credential.issuerId,
      issuedAt: credential.issuedAt,
      revokedAt: credential.revokedAt,
    };
  }

  async revokeCredential(request: RevocationRequest): Promise<LedgerCredential> {
    assert(request.action === "REVOKE", "INVALID_ACTION", "action must be REVOKE");
    assert(REVOCATION_REASONS.includes(request.reason), "INVALID_REASON", "unknown revocation reason");
    assert(isIsoDate(request.revokedAt), "INVALID_DATE", "revokedAt must be an ISO date");
    const credential = await this.getCredential(request.credentialId);
    assert(credential, "NOT_FOUND", "credential does not exist");
    assert(credential.status === "ACTIVE", "ALREADY_REVOKED", "credential is already revoked");

    const message = revocationSigningMessage(request);
    const auth = request.authorization;
    if (auth.by === "issuer") {
      const issuer = await this.getIssuer(credential.issuerId);
      assert(issuer, "UNKNOWN_ISSUER", "issuer is not registered");
      assert(
        this.crypto.verifyEd25519(issuer.publicKey, message, auth.signature),
        "BAD_SIGNATURE",
        "revocation must be signed by the credential issuer",
      );
    } else {
      assert(HEX64.test(auth.holderPublicKey), "INVALID_KEY", "holder key is malformed");
      assert(
        subjectCommitmentFor(this.crypto, auth.holderPublicKey, auth.subjectSalt) === credential.subjectCommitment,
        "NOT_HOLDER",
        "revocation key does not match the credential subject",
      );
      assert(
        this.crypto.verifyEd25519(auth.holderPublicKey, message, auth.signature),
        "BAD_SIGNATURE",
        "revocation must be signed by the credential holder",
      );
    }

    const revoked: LedgerCredential = {
      ...credential,
      status: "REVOKED",
      revokedAt: request.revokedAt,
      revocationReason: request.reason,
      revokedBy: auth.by,
    };
    await this.state.put(credentialKey(revoked.credentialId), canonicalize(revoked));
    return revoked;
  }
}
