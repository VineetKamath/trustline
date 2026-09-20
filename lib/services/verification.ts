import "server-only";
import { entity, ref, type CedarValue } from "@/lib/aws/cedar";
import { CLAIMS, PURPOSE_LABELS, claimLabel, evaluatePredicate } from "@/lib/credentials/claims";
import { PredicateNotSatisfiedError, createPresentation, verifyPresentation } from "@/lib/credentials/crypto";
import { getSchema } from "@/lib/credentials/schemas";
import { randomHex } from "@/lib/crypto/encoding";
import type {
  ClaimKey,
  CredentialMetadata,
  Interpretation,
  PolicyDecision,
  StructuredRequest,
  UserRecord,
  VerificationChecks,
  VerificationRequestRecord,
  VerificationResultRecord,
} from "@/types";
import { recordActivity } from "./activity";
import type { Services } from "./context";
import { ServiceError, badRequest, forbidden, notFound } from "./errors";
import { getOrg, holderEntity, verifierEntity } from "./organizations";
import { byNewest, newId, nowIso } from "./util";
import { findUserByTrustlineId, getUser, getWalletEntry, holderSecretKey } from "./wallet";

// ── Interpretation (Strands) ───────────────────────────────────────────────

export async function interpretRequest(s: Services, orgId: string, text: string): Promise<Interpretation> {
  const org = await getOrg(s, orgId);
  const { structured, engine } = await s.interpreter.interpret(text, { verifierName: org.name });
  const interpretation: Interpretation = {
    id: newId("int"),
    orgId,
    text,
    structured,
    engine,
    createdAt: nowIso(),
  };
  await s.store.put("interpretations", interpretation);
  return interpretation;
}

// ── Request creation (Cedar) ───────────────────────────────────────────────

const ACTION_FOR_KIND: Partial<Record<StructuredRequest["kind"], string>> = {
  predicate: "RequestPredicateProof",
  full_history: "RequestFullHistory",
  identity: "RequestIdentity",
  raw_value: "RequestRawValue",
};

export function requestLabel(structured: StructuredRequest): string {
  if (structured.kind === "predicate" && structured.claim && structured.threshold !== undefined) {
    return claimLabel(structured.claim, structured.threshold);
  }
  if (structured.kind === "full_history") return "Complete transaction history";
  if (structured.kind === "identity") return "Personal identity details";
  if (structured.kind === "raw_value") return `Exact ${CLAIMS[structured.claim ?? "successful_transactions"].noun}`;
  return structured.summary;
}

export async function authorizeVerifierRequest(
  s: Services,
  orgId: string,
  structured: StructuredRequest,
): Promise<PolicyDecision> {
  const org = await getOrg(s, orgId);
  const action = ACTION_FOR_KIND[structured.kind];
  if (!action) throw badRequest("Choose a specific claim to verify first");
  const claimId = structured.claim ?? "unspecified";
  const context: Record<string, CedarValue> =
    structured.kind === "predicate"
      ? {
          operator: structured.operator ?? ">=",
          threshold: structured.threshold ?? 0,
          purpose: structured.purpose,
          disclosure: "predicate_result_only",
        }
      : { purpose: structured.purpose, disclosure: structured.kind };

  return s.policy.authorize({
    principal: ref("Verifier", org.id),
    action,
    resource: ref("Claim", claimId),
    context,
    entities: [
      verifierEntity(org),
      {
        uid: ref("Claim", claimId),
        attrs: {
          supported: structured.claim ? structured.claim in CLAIMS : false,
          unit: structured.claim ? CLAIMS[structured.claim].unit : "none",
        },
        parents: [],
      },
    ],
  });
}

export async function createVerificationRequest(
  s: Services,
  orgId: string,
  input: { subjectTrustlineId: string; interpretationId: string; suggestionIndex?: number; at?: string },
): Promise<VerificationRequestRecord> {
  const org = await getOrg(s, orgId);
  const interpretation = await s.store.get("interpretations", input.interpretationId);
  if (!interpretation || interpretation.orgId !== orgId) throw notFound("Interpretation");

  let structured = interpretation.structured;
  if (structured.kind === "clarification") {
    const choice = input.suggestionIndex !== undefined ? structured.suggestions?.[input.suggestionIndex] : undefined;
    if (!choice) throw badRequest("Choose one of the suggested claims");
    structured = choice;
  }
  if (structured.kind === "unsupported") throw badRequest("This request cannot be expressed as a verifiable claim");

  const subject = await findUserByTrustlineId(s, input.subjectTrustlineId);
  if (!subject) throw notFound(`Trustline ${input.subjectTrustlineId}`);

  // Cedar is the only authority that decides whether the request may proceed.
  const policy = await authorizeVerifierRequest(s, orgId, structured);
  const at = input.at ?? nowIso();

  if (policy.decision === "ALLOW") {
    // Supersede an older pending request for the same claim from this verifier.
    const pending = await s.store.query("verificationRequests", "subjectUserId", subject.id);
    for (const p of pending) {
      if (p.status === "PENDING" && p.verifierId === orgId && p.structured.claim === structured.claim) {
        await s.store.put("verificationRequests", { ...p, status: "SUPERSEDED", respondedAt: at });
      }
    }
  }

  const request: VerificationRequestRecord = {
    id: newId("vrq"),
    verifierId: orgId,
    subjectTrustlineId: subject.trustlineId,
    subjectUserId: subject.id,
    interpretationId: interpretation.id,
    naturalLanguage: interpretation.text,
    structured,
    policy,
    status: policy.decision === "ALLOW" ? "PENDING" : "DENIED_BY_POLICY",
    nonce: randomHex(16),
    createdAt: at,
  };
  if (policy.decision === "DENY") request.respondedAt = at;
  await s.store.put("verificationRequests", request);

  const label = requestLabel(structured);
  if (policy.decision === "ALLOW") {
    await recordActivity(s, {
      ownerId: subject.id,
      kind: "verification_requested",
      actor: org.name,
      title: `Requested: ${label}`,
      detail: PURPOSE_LABELS[structured.purpose],
      ref: { type: "verification", id: request.id },
      at,
    });
  } else {
    await recordActivity(s, {
      ownerId: subject.id,
      kind: "verification_blocked",
      actor: org.name,
      title: `Blocked: ${label}`,
      detail: `Denied by Cedar policy. ${policy.reasons[0] ?? ""}`.trim(),
      ref: { type: "verification", id: request.id },
      at,
    });
  }
  return request;
}

// ── Holder decisions ───────────────────────────────────────────────────────

async function holderRequest(s: Services, user: UserRecord, requestId: string) {
  const request = await s.store.get("verificationRequests", requestId);
  if (!request) throw notFound("Verification request");
  if (request.subjectUserId !== user.id) throw forbidden();
  return request;
}

export async function declineRequest(s: Services, userId: string, requestId: string, at?: string) {
  const user = await getUser(s, userId);
  const request = await holderRequest(s, user, requestId);
  if (request.status !== "PENDING") throw new ServiceError(409, "NOT_PENDING", "This request is no longer pending");
  const updated: VerificationRequestRecord = { ...request, status: "DECLINED", respondedAt: at ?? nowIso() };
  await s.store.put("verificationRequests", updated);
  const org = await getOrg(s, request.verifierId);
  await recordActivity(s, {
    ownerId: user.id,
    kind: "verification_declined",
    actor: org.name,
    title: `Declined: ${requestLabel(request.structured)}`,
    detail: "Nothing was shared.",
    ref: { type: "verification", id: request.id },
    at,
  });
  return updated;
}

export async function approveRequest(s: Services, userId: string, requestId: string, at?: string) {
  const user = await getUser(s, userId);
  const request = await holderRequest(s, user, requestId);
  const org = await getOrg(s, request.verifierId);

  const policy = await s.policy.authorize({
    principal: ref("Holder", user.id),
    action: "ApproveVerification",
    resource: ref("VerificationRequest", request.id),
    context: {},
    entities: [
      holderEntity(user),
      verifierEntity(org),
      {
        uid: ref("VerificationRequest", request.id),
        attrs: {
          subject: entity("Holder", user.id),
          verifier: entity("Verifier", org.id),
          status: request.status,
        },
        parents: [],
      },
    ],
  });
  if (policy.decision !== "ALLOW") {
    throw new ServiceError(409, "NOT_APPROVABLE", "This request can no longer be approved");
  }
  const updated: VerificationRequestRecord = { ...request, status: "APPROVED", respondedAt: at ?? nowIso() };
  await s.store.put("verificationRequests", updated);
  return { request: updated, policy };
}

// ── Proof generation and verification ──────────────────────────────────────

export interface ProofTrace {
  requestLabel: string;
  verifierName: string;
  structured: StructuredRequest;
  policy: PolicyDecision;
  credential?: {
    credentialId: string;
    title: string;
    issuerName: string;
    blockchainTxId: string;
    chainStatus: string;
  };
  /** Holder-only: the private value that never leaves the wallet. */
  privateValue?: string;
  proofBytes?: number;
  proofMs?: number;
  verifyMs?: number;
  bitCommitments?: number;
}

function pickCandidates(metas: CredentialMetadata[], claim: ClaimKey) {
  return metas.filter((m) => CLAIMS[claim].credentialTypes.includes(m.credentialType)).sort(byNewest);
}

const EMPTY_CHECKS: VerificationChecks = {
  policyAuthorized: true,
  credentialOnChain: false,
  credentialActive: false,
  issuerRegistered: false,
  issuerSignatureValid: false,
  commitmentMatchesLedger: false,
  holderBindingValid: false,
  proofValid: false,
};

export async function proveRequest(
  s: Services,
  userId: string,
  requestId: string,
  at?: string,
): Promise<{ result: VerificationResultRecord; trace: ProofTrace; request: VerificationRequestRecord }> {
  const user = await getUser(s, userId);
  const request = await holderRequest(s, user, requestId);
  if (request.status !== "APPROVED") {
    throw new ServiceError(409, "NOT_APPROVED", "Approve the request before generating a proof");
  }
  const org = await getOrg(s, request.verifierId);
  const { structured } = request;
  if (structured.kind !== "predicate" || !structured.claim || structured.threshold === undefined) {
    throw badRequest("Only predicate requests can be proven");
  }
  const claim = structured.claim;
  const threshold = structured.threshold;
  const label = claimLabel(claim, threshold);
  const createdAt = at ?? nowIso();
  const trace: ProofTrace = { requestLabel: label, verifierName: org.name, structured, policy: request.policy };

  // 1. Holder wallet selects a credential able to answer the claim.
  const metas = pickCandidates(await s.store.query("credentials", "holderUserId", user.id), claim);
  const predicate = CLAIMS[claim].predicate(threshold);
  type Candidate = { meta: CredentialMetadata; active: boolean; satisfied: boolean; values: Record<string, number> };
  const candidates: Candidate[] = [];
  for (const meta of metas) {
    const status = await s.chain.getCredentialStatus(meta.credentialId);
    const { openings } = await getWalletEntry(s, user.id, meta.credentialId);
    const values = Object.fromEntries(Object.entries(openings).map(([k, o]) => [k, o.value]));
    candidates.push({
      meta,
      active: status.status === "ACTIVE",
      satisfied: evaluatePredicate(predicate.coefficients, predicate.threshold, values).satisfied,
      values,
    });
  }
  const chosen =
    candidates.find((c) => c.active && c.satisfied) ?? candidates.find((c) => c.active) ?? candidates[0];

  const finish = async (
    partial: Omit<VerificationResultRecord, "id" | "requestId" | "verifierId" | "subjectUserId" | "claimLabel" | "disclosed" | "createdAt">,
  ) => {
    const result: VerificationResultRecord = {
      id: newId("vres"),
      requestId: request.id,
      verifierId: org.id,
      subjectUserId: user.id,
      claimLabel: label,
      disclosed: { identity: false, history: false, values: false },
      createdAt,
      ...partial,
    };
    await s.store.put("verificationResults", result);
    const updated: VerificationRequestRecord = {
      ...request,
      status: result.outcome,
      resultId: result.id,
      respondedAt: request.respondedAt ?? createdAt,
    };
    await s.store.put("verificationRequests", updated);
    await recordActivity(s, {
      ownerId: user.id,
      kind: result.outcome === "VERIFIED" ? "verification_approved" : "verification_failed",
      actor: org.name,
      title:
        result.outcome === "VERIFIED"
          ? `Verified: ${label}`
          : result.outcome === "NOT_SATISFIED"
            ? `Not met: ${label}`
            : `Failed: ${label}`,
      detail:
        result.outcome === "VERIFIED"
          ? "Private proof shared. Identity, history and values stayed hidden."
          : result.failureReason,
      ref: { type: "verification", id: request.id },
      at: createdAt,
    });
    await recordActivity(s, {
      ownerId: org.id,
      kind: result.outcome === "VERIFIED" ? "verification_approved" : "verification_failed",
      actor: org.name,
      title: `${result.outcome === "VERIFIED" ? "Verified" : result.outcome === "NOT_SATISFIED" ? "Not met" : "Failed"}: ${label} for ${user.trustlineId}`,
      ref: { type: "verification", id: request.id },
      at: createdAt,
    });
    return { result, trace, request: updated };
  };

  if (!chosen) {
    return finish({
      outcome: "FAILED",
      checks: EMPTY_CHECKS,
      chainStatus: "NONE",
      failureReason: "You don't hold a credential that can answer this request.",
    });
  }

  const issuer = await getOrg(s, chosen.meta.issuerId);
  const headlineAttr = getSchema(chosen.meta.credentialType).headline.attribute;
  trace.credential = {
    credentialId: chosen.meta.credentialId,
    title: getSchema(chosen.meta.credentialType).title,
    issuerName: issuer.name,
    blockchainTxId: chosen.meta.blockchainTxId,
    chainStatus: chosen.active ? "ACTIVE" : "REVOKED",
  };
  if (CLAIMS[claim].unit === "percent") {
    const v = chosen.values;
    const ratio = (a: number, b: number) => (a ?? 0) / Math.max(1, b ?? 0);
    const pct =
      claim === "booking_reliability_pct"
        ? ratio(v.successful_transactions, (v.successful_transactions ?? 0) + (v.no_shows ?? 0))
        : claim === "payment_reliability_pct"
          ? ratio(v.payments_completed, v.successful_transactions)
          : claim === "provider_completion_pct"
            ? ratio(v.completed_bookings, v.bookings_accepted)
            : ratio(v.seller_orders_completed, v.seller_orders_accepted);
    trace.privateValue = `${Math.round(pct * 100)}%`;
  } else {
    trace.privateValue = String(chosen.values[headlineAttr] ?? 0);
  }

  // 2. The ledger is the source of truth for credential status.
  const ledgerCheck = await s.chain.verifyCredential(chosen.meta.credentialId, chosen.meta.claimCommitment);
  if (ledgerCheck.status !== "ACTIVE") {
    return finish({
      outcome: "FAILED",
      checks: {
        ...EMPTY_CHECKS,
        credentialOnChain: ledgerCheck.found,
        issuerRegistered: ledgerCheck.issuerRegistered,
        issuerSignatureValid: ledgerCheck.issuerSignatureValid,
        commitmentMatchesLedger: ledgerCheck.claimCommitmentMatches,
      },
      chainStatus: ledgerCheck.status,
      credentialId: chosen.meta.credentialId,
      blockchainTxId: chosen.meta.blockchainTxId,
      failureReason:
        ledgerCheck.status === "REVOKED"
          ? `The ${issuer.name} credential was revoked on the ledger. It can no longer be used for verification.`
          : "The credential could not be found on the ledger.",
    });
  }

  // 3. Holder generates the zero-knowledge presentation.
  const { subjectSalt, openings } = await getWalletEntry(s, user.id, chosen.meta.credentialId);
  let presentation;
  const t0 = performance.now();
  try {
    presentation = createPresentation({
      requestId: request.id,
      nonce: request.nonce,
      credential: chosen.meta,
      openings,
      subjectSalt,
      holder: { trustlineId: user.trustlineId, publicKey: user.holderPublicKey, secretKey: holderSecretKey(user) },
      claim,
      threshold,
    });
  } catch (error) {
    if (error instanceof PredicateNotSatisfiedError) {
      return finish({
        outcome: "NOT_SATISFIED",
        checks: {
          ...EMPTY_CHECKS,
          credentialOnChain: true,
          credentialActive: true,
          issuerRegistered: ledgerCheck.issuerRegistered,
          issuerSignatureValid: ledgerCheck.issuerSignatureValid,
          commitmentMatchesLedger: ledgerCheck.claimCommitmentMatches,
        },
        chainStatus: "ACTIVE",
        credentialId: chosen.meta.credentialId,
        blockchainTxId: chosen.meta.blockchainTxId,
        failureReason: "Your verified history does not meet this threshold. No value was disclosed.",
      });
    }
    throw error;
  }
  const proofMs = Math.round(performance.now() - t0);
  const serialized = JSON.stringify(presentation);

  // 4. Verifier-side verification: ledger record + presentation only.
  const t1 = performance.now();
  const ledgerRecord = await s.chain.getCredential(presentation.credentialId);
  const ledgerVerify = await s.chain.verifyCredential(presentation.credentialId, presentation.claimCommitment);
  const check = ledgerRecord
    ? verifyPresentation(presentation, {
        requestId: request.id,
        nonce: request.nonce,
        trustlineId: request.subjectTrustlineId,
        claim,
        threshold,
        ledger: ledgerRecord,
      })
    : { commitmentMatchesLedger: false, holderBindingValid: false, predicateMatchesRequest: false, proofValid: false };
  const verifyMs = Math.round(performance.now() - t1);

  const checks: VerificationChecks = {
    policyAuthorized: request.policy.decision === "ALLOW",
    credentialOnChain: ledgerVerify.found,
    credentialActive: ledgerVerify.status === "ACTIVE",
    issuerRegistered: ledgerVerify.issuerRegistered,
    issuerSignatureValid: ledgerVerify.issuerSignatureValid,
    commitmentMatchesLedger: check.commitmentMatchesLedger && ledgerVerify.claimCommitmentMatches,
    holderBindingValid: check.holderBindingValid,
    proofValid: check.proofValid && check.predicateMatchesRequest,
  };
  const allValid = Object.values(checks).every(Boolean);
  trace.proofBytes = serialized.length;
  trace.proofMs = proofMs;
  trace.verifyMs = verifyMs;
  trace.bitCommitments = presentation.proof.bits;

  return finish({
    outcome: allValid ? "VERIFIED" : "FAILED",
    checks,
    chainStatus: ledgerVerify.status,
    presentation,
    presentationBytes: serialized.length,
    proofMs,
    verifyMs,
    credentialId: presentation.credentialId,
    blockchainTxId: chosen.meta.blockchainTxId,
    failureReason: allValid ? undefined : "The proof did not pass verification.",
  });
}

// ── Views ──────────────────────────────────────────────────────────────────

export interface RequestView {
  id: string;
  verifierName: string;
  verifierMonogram: string;
  verifierTone: string;
  subjectTrustlineId: string;
  naturalLanguage: string;
  structured: StructuredRequest;
  label: string;
  purposeLabel: string;
  policy: PolicyDecision;
  status: VerificationRequestRecord["status"];
  createdAt: string;
  respondedAt?: string;
  result?: Omit<VerificationResultRecord, "presentation"> & { hasPresentation: boolean };
}

async function toView(s: Services, r: VerificationRequestRecord): Promise<RequestView> {
  const org = await getOrg(s, r.verifierId);
  const result = r.resultId ? await s.store.get("verificationResults", r.resultId) : null;
  let resultView: RequestView["result"];
  if (result) {
    const { presentation, ...rest } = result;
    resultView = { ...rest, hasPresentation: Boolean(presentation) };
  }
  return {
    id: r.id,
    verifierName: org.name,
    verifierMonogram: org.monogram,
    verifierTone: org.tone,
    subjectTrustlineId: r.subjectTrustlineId,
    naturalLanguage: r.naturalLanguage,
    structured: r.structured,
    label: requestLabel(r.structured),
    purposeLabel: PURPOSE_LABELS[r.structured.purpose],
    policy: r.policy,
    status: r.status,
    createdAt: r.createdAt,
    respondedAt: r.respondedAt,
    result: resultView,
  };
}

export async function listHolderRequests(s: Services, userId: string) {
  const all = await s.store.query("verificationRequests", "subjectUserId", userId);
  return Promise.all(all.filter((r) => r.status !== "SUPERSEDED").sort(byNewest).map((r) => toView(s, r)));
}

export async function listVerifierRequests(s: Services, orgId: string) {
  const all = await s.store.query("verificationRequests", "verifierId", orgId);
  return Promise.all(all.filter((r) => r.status !== "SUPERSEDED").sort(byNewest).map((r) => toView(s, r)));
}

/** Verifier view: includes the presentation they received — which contains no values. */
export async function getRequestForVerifier(s: Services, orgId: string, requestId: string) {
  const r = await s.store.get("verificationRequests", requestId);
  if (!r || r.verifierId !== orgId) throw notFound("Verification request");
  const view = await toView(s, r);
  const result = r.resultId ? await s.store.get("verificationResults", r.resultId) : null;
  return { ...view, presentation: result?.presentation ?? null };
}

export async function getRequestForHolder(s: Services, userId: string, requestId: string) {
  const user = await getUser(s, userId);
  const r = await holderRequest(s, user, requestId);
  return toView(s, r);
}

export async function holderPrivacyStats(s: Services, userId: string) {
  const results = await s.store.query("verificationResults", "subjectUserId", userId);
  const requests = await s.store.query("verificationRequests", "subjectUserId", userId);
  return {
    proofsGenerated: results.filter((r) => r.presentation).length,
    verified: results.filter((r) => r.outcome === "VERIFIED").length,
    blocked: requests.filter((r) => r.status === "DENIED_BY_POLICY").length,
    declined: requests.filter((r) => r.status === "DECLINED").length,
    identityShared: results.filter((r) => r.disclosed.identity).length,
    historyShared: results.filter((r) => r.disclosed.history).length,
  };
}
