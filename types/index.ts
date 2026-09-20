import type { LedgerCredentialStatus, RevocationReason } from "@/contracts/trustline-chaincode/src/types";
import type { RangeProof } from "@/lib/crypto/rangeProof";
import type { Category } from "@/lib/platforms/categories";

export type { LedgerCredentialStatus, RevocationReason };

// ── Identity ────────────────────────────────────────────────────────────────

export type SubjectRole = "buyer" | "seller";

/**
 * A Trustline holder. `cognitoSub` (application login) and `trustlineId`
 * (reputation identity) are deliberately separate fields and the former is
 * never returned by public APIs.
 */
export interface UserRecord {
  id: string;
  displayName: string;
  trustlineId: string;
  holderPublicKey: string;
  /** Holder secret key, sealed with AES-256-GCM. */
  holderKeySealed: string;
  cognitoSub?: string;
  /** Claims the holder has chosen to publish on their public profile. */
  publishedClaims: string[];
  /** Whether this user can sign in (demo personas) or only exists as a subject. */
  loginEnabled: boolean;
  createdAt: string;
}

export type OrgRole = "issuer" | "verifier";

export interface OrganizationRecord {
  id: string;
  name: string;
  shortName: string;
  description: string;
  /** Plain-English gloss shown in brackets after the name, e.g. "issuer — a marketplace that vouches for its users". */
  label: string;
  category: "marketplace" | "hospitality" | "work" | "mobility" | "booking" | Category;
  roles: OrgRole[];
  registered: boolean;
  issuerPublicKey?: string;
  issuerKeySealed?: string;
  allowedCredentialTypes: string[];
  allowedPurposes: string[];
  /** Seeded counters representing credentials issued before this demo ledger. */
  historical: { issued: number; revoked: number };
  monogram: string;
  tone: "indigo" | "emerald" | "amber" | "sky" | "rose" | "slate";
}

// ── Credentials ─────────────────────────────────────────────────────────────

/** Off-chain index of an issued credential. Contains no plaintext values. */
export interface CredentialMetadata {
  credentialId: string;
  issuerId: string;
  holderUserId: string;
  subjectCommitment: string;
  credentialType: string;
  claimCommitment: string;
  /** Pedersen commitments per attribute (hiding; safe to share). */
  attributeCommitments: Record<string, string>;
  issuerSignature: string;
  blockchainTxId: string;
  blockNumber: number;
  status: LedgerCredentialStatus;
  issuedAt: string;
  revokedAt?: string;
  revocationTxId?: string;
  revocationReason?: RevocationReason;
  /** Optional pointer to encrypted off-chain evidence (S3). */
  evidenceRef?: string;
  source?: { kind: "booking"; bookingId: string };
  /** Service category the credential describes (for display nouns). */
  category?: Category;
}

export interface AttributeOpening {
  value: number;
  /** Blinding factor as little-endian hex. */
  blinding: string;
}

/** Holder-only secrets for a credential, stored sealed. */
export interface WalletEntry {
  id: string;
  credentialId: string;
  userId: string;
  subjectSalt: string;
  openingsSealed: string;
}

// ── Verification ────────────────────────────────────────────────────────────

export type RequestKind =
  | "predicate"
  | "full_history"
  | "identity"
  | "raw_value"
  | "clarification"
  | "unsupported";

export type ClaimKey =
  | "successful_transactions"
  | "completed_stays"
  | "completed_projects"
  | "completed_bookings_hosted"
  | "booking_reliability_pct"
  | "seller_completion_pct"
  | "provider_completion_pct"
  | "payment_reliability_pct";

export type Purpose =
  | "buyer_verification"
  | "seller_verification"
  | "guest_verification"
  | "host_verification"
  | "freelancer_verification";

export interface StructuredRequest {
  kind: RequestKind;
  claim?: ClaimKey;
  operator?: ">=";
  threshold?: number;
  purpose: Purpose;
  subjectRole: SubjectRole;
  /** For over-broad requests: what the verifier actually asked for. */
  requestedData?: string[];
  suggestions?: StructuredRequest[];
  summary: string;
}

export interface Interpretation {
  id: string;
  orgId: string;
  text: string;
  structured: StructuredRequest;
  engine: "local-deterministic" | "strands-bedrock";
  createdAt: string;
}

export interface PolicyDecision {
  decision: "ALLOW" | "DENY";
  engine: "cedar-local" | "amazon-verified-permissions";
  action: string;
  determiningPolicies: string[];
  reasons: string[];
  evaluatedAt: string;
}

export type VerificationStatus =
  | "DENIED_BY_POLICY"
  | "PENDING"
  | "DECLINED"
  | "APPROVED"
  | "VERIFIED"
  | "NOT_SATISFIED"
  | "FAILED"
  | "SUPERSEDED";

export interface VerificationRequestRecord {
  id: string;
  verifierId: string;
  subjectTrustlineId: string;
  subjectUserId: string | null;
  interpretationId: string;
  naturalLanguage: string;
  structured: StructuredRequest;
  policy: PolicyDecision;
  status: VerificationStatus;
  nonce: string;
  createdAt: string;
  respondedAt?: string;
  resultId?: string;
}

/** Exactly what the verifier receives from the holder. */
export interface Presentation {
  version: "trustline-presentation-v1";
  requestId: string;
  nonce: string;
  credentialId: string;
  issuerId: string;
  credentialType: string;
  claimCommitment: string;
  attributeCommitments: Record<string, string>;
  predicate: {
    claim: ClaimKey;
    label: string;
    coefficients: Record<string, number>;
    threshold: number;
  };
  holderBinding: {
    trustlineId: string;
    holderPublicKey: string;
    subjectSalt: string;
    signature: string;
  };
  proof: RangeProof;
}

export interface VerificationChecks {
  policyAuthorized: boolean;
  credentialOnChain: boolean;
  credentialActive: boolean;
  issuerRegistered: boolean;
  issuerSignatureValid: boolean;
  commitmentMatchesLedger: boolean;
  holderBindingValid: boolean;
  proofValid: boolean;
}

export type VerificationOutcome = "VERIFIED" | "NOT_SATISFIED" | "FAILED";

export interface VerificationResultRecord {
  id: string;
  requestId: string;
  verifierId: string;
  subjectUserId: string;
  outcome: VerificationOutcome;
  claimLabel: string;
  checks: VerificationChecks;
  failureReason?: string;
  presentation?: Presentation;
  presentationBytes?: number;
  proofMs?: number;
  verifyMs?: number;
  chainStatus: LedgerCredentialStatus | "NOT_FOUND" | "NONE";
  credentialId?: string;
  blockchainTxId?: string;
  disclosed: { identity: false; history: false; values: false };
  createdAt: string;
}

// ── Marketplace ─────────────────────────────────────────────────────────────

export interface Listing {
  id: string;
  category: Category;
  title: string;
  city: string;
  neighbourhood: string;
  price: number;
  providerUserId: string;
  providerName: string;
  /** Plain-English explanation shown in brackets after the provider's name. */
  providerLabel: string;
  providerSince: string;
  rating?: number;
  reviewCount?: number;
  highlights: string[];
  description: string;
  palette: [string, string, string];
  tag?: string;
}

export interface GuestFeedback {
  serviceCompleted: boolean;
  listingAccurate: boolean;
  hostCancelled: boolean;
  submittedAt: string;
}

export interface HostFeedback {
  guestShowedUp: boolean;
  paidAsAgreed: boolean;
  guestCancelled: boolean;
  submittedAt: string;
}

/**
 * A booking is a *request* until the provider accepts it. Nobody is obliged to
 * hand over their car, their home or an afternoon of their time to whoever
 * clicks first, so the provider decides — and the point of Trustline is that
 * they can decide on verified behaviour instead of a photo and a hunch.
 */
export type BookingStatus = "REQUESTED" | "DECLINED" | "CONFIRMED" | "COMPLETED" | "REVIEWED";

/**
 * What the provider could see about the customer at the moment they decided.
 * Only ever the customer's *published* claims — never private values. Stored
 * so the decision stays auditable after the customer's numbers move on.
 */
export interface TrustSnapshot {
  status: "VERIFIED" | "LIMITED";
  verifiedCredentials: number;
  revokedCredentials: number;
  bookingReliability: number | null;
  issuers: string[];
  takenAt: string;
}

export interface BookingRecord {
  id: string;
  listingId: string;
  guestUserId: string;
  hostUserId: string;
  category: Category;
  checkIn: string;
  checkOut: string;
  /** Nights, days, or 1 for single-unit services. */
  quantity: number;
  total: number;
  status: BookingStatus;
  /** The customer's published trust as the provider saw it when deciding. */
  guestTrust?: TrustSnapshot;
  /** Why the provider turned the request down, in their own words. */
  declineReason?: string;
  guestFeedback?: GuestFeedback;
  hostFeedback?: HostFeedback;
  issuedCredentialIds: string[];
  createdAt: string;
  respondedAt?: string;
  completedAt?: string;
}

// ── Activity ────────────────────────────────────────────────────────────────

export type ActivityKind =
  | "credential_issued"
  | "credential_revoked"
  | "verification_requested"
  | "verification_approved"
  | "verification_declined"
  | "verification_blocked"
  | "verification_failed"
  | "booking_requested"
  | "booking_confirmed"
  | "booking_declined"
  | "booking_completed"
  | "feedback_submitted";

export interface ActivityRecord {
  id: string;
  ownerId: string;
  kind: ActivityKind;
  actor: string;
  title: string;
  detail?: string;
  createdAt: string;
  ref?: { type: "credential" | "verification" | "booking"; id: string };
}

// ── Reputation ──────────────────────────────────────────────────────────────

export interface MetricInput {
  label: string;
  value: number;
}

export interface ReputationMetric {
  key: string;
  label: string;
  /** Percentage 0–100, or null when there is not enough verified history. */
  value: number | null;
  display: string;
  level?: "Low" | "Moderate" | "High";
  formula: string;
  inputs: MetricInput[];
  sources: string[];
}

export interface ReputationContext {
  role: SubjectRole | "guest" | "freelancer";
  title: string;
  metrics: ReputationMetric[];
  totals: MetricInput[];
  /** Number of transactions behind these metrics. */
  sampleSize: number;
  /** True when there is too little history for percentages to mean much. */
  limitedHistory: boolean;
}
