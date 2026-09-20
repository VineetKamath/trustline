import "server-only";
import { revocationSigningMessage } from "@/contracts/trustline-chaincode/src/logic";
import type { RevocationReason, RevocationRequest } from "@/contracts/trustline-chaincode/src/types";
import { entity, ref } from "@/lib/aws/cedar";
import { buildCredential } from "@/lib/credentials/crypto";
import { getSchema } from "@/lib/credentials/schemas";
import { CATEGORIES, type Category } from "@/lib/platforms/categories";
import { signMessage } from "@/lib/crypto/signatures";
import type { CredentialValues } from "@/lib/reputation/engine";
import type { TxReceipt } from "@/lib/blockchain/interface";
import type { CredentialMetadata, OrganizationRecord, PolicyDecision, UserRecord } from "@/types";
import { recordActivity } from "./activity";
import type { Services } from "./context";
import { ServiceError, badRequest, forbidden, notFound } from "./errors";
import { getOrg, holderEntity, issuerEntity, issuerSecretKey, listOrgs } from "./organizations";
import { byNewest, newId, nowIso } from "./util";
import { findUserByTrustlineId, getUser, getWalletEntry, holderSecretKey, storeWalletEntry } from "./wallet";

const PROVIDER_SIDE = ["PROVIDER_RECORD", "PROVIDER_OUTCOME"];
const CUSTOMER_SIDE = ["CUSTOMER_RECORD", "CUSTOMER_OUTCOME"];

export function categoryOf(org: OrganizationRecord | undefined, explicit?: Category): Category | undefined {
  if (explicit) return explicit;
  return org && org.category in CATEGORIES ? (org.category as Category) : undefined;
}

/** Category-aware title, e.g. "Car rental · renter record". */
export function describeCredential(type: string, category?: Category) {
  const schema = getSchema(type);
  if (category && (PROVIDER_SIDE.includes(type) || CUSTOMER_SIDE.includes(type))) {
    const c = CATEGORIES[category];
    const provider = PROVIDER_SIDE.includes(type);
    const who = (provider ? c.provider : c.customer).toLowerCase();
    const outcome = type.endsWith("_OUTCOME");
    return {
      title: `${c.label} · ${outcome ? `${who} outcome` : `${who} record`}`,
      noun: provider ? c.providerNoun : c.customerNoun,
    };
  }
  return { title: schema.title, noun: schema.headline.noun };
}

export function headlineFor(type: string, values: Record<string, number>, category?: Category) {
  const schema = getSchema(type);
  const value = values[schema.headline.attribute] ?? 0;
  const noun = describeCredential(type, category).noun;
  return { value, noun, text: `${value} ${noun}` };
}

export interface IssueStep {
  key: "created" | "commitment" | "submitted" | "confirmed" | "active";
  label: string;
  detail?: string;
}

/** Issues a credential (no authorization — callers must have authorized). */
export async function issueCredentialInternal(
  s: Services,
  input: {
    org: OrganizationRecord;
    holder: UserRecord;
    credentialType: string;
    values: Record<string, number>;
    at?: string;
    source?: CredentialMetadata["source"];
    evidence?: unknown;
    quiet?: boolean;
    category?: Category;
  },
): Promise<{ metadata: CredentialMetadata; receipt: TxReceipt; steps: IssueStep[] }> {
  const issuedAt = input.at ?? nowIso();
  const credentialId = newId("cred");
  const built = buildCredential({
    credentialId,
    issuerId: input.org.id,
    issuerSecretKey: issuerSecretKey(input.org),
    holderPublicKey: input.holder.holderPublicKey,
    credentialType: input.credentialType,
    values: input.values,
    issuedAt,
  });

  // Only commitments, hashes and the issuer signature go to the ledger.
  const receipt = await s.chain.issueCredential(built.ledgerRecord);

  let evidenceRef: string | undefined;
  if (input.evidence !== undefined) evidenceRef = await s.evidence.put(credentialId, input.evidence);

  const metadata: CredentialMetadata = {
    credentialId,
    issuerId: input.org.id,
    holderUserId: input.holder.id,
    subjectCommitment: built.ledgerRecord.subjectCommitment,
    credentialType: input.credentialType,
    claimCommitment: built.ledgerRecord.claimCommitment,
    attributeCommitments: built.attributeCommitments,
    issuerSignature: built.ledgerRecord.issuerSignature,
    blockchainTxId: receipt.txId,
    blockNumber: receipt.blockNumber,
    status: "ACTIVE",
    issuedAt,
    evidenceRef,
    source: input.source,
    category: categoryOf(input.org, input.category),
  };
  await s.store.put("credentials", metadata);
  await storeWalletEntry(s, {
    userId: input.holder.id,
    credentialId,
    subjectSalt: built.subjectSalt,
    openings: built.openings,
  });

  const headline = headlineFor(input.credentialType, input.values, metadata.category);
  const described = describeCredential(input.credentialType, metadata.category);
  if (!input.quiet) {
    await recordActivity(s, {
      ownerId: input.holder.id,
      kind: "credential_issued",
      actor: input.org.name,
      title: `Issued: ${headline.text}`,
      detail: described.title,
      ref: { type: "credential", id: credentialId },
      at: issuedAt,
    });
    await recordActivity(s, {
      ownerId: input.org.id,
      kind: "credential_issued",
      actor: input.org.name,
      title: `Issued ${described.title.toLowerCase()} to ${input.holder.trustlineId}`,
      ref: { type: "credential", id: credentialId },
      at: issuedAt,
    });
  }

  return {
    metadata,
    receipt,
    steps: [
      { key: "created", label: "Credential created", detail: credentialId },
      {
        key: "commitment",
        label: "Cryptographic commitment generated",
        detail: built.ledgerRecord.claimCommitment,
      },
      { key: "submitted", label: "Blockchain transaction submitted", detail: receipt.txId },
      { key: "confirmed", label: "Blockchain confirmation received", detail: `Block #${receipt.blockNumber}` },
      { key: "active", label: "Credential ACTIVE" },
    ],
  };
}

/** Issuer-console issuance: Cedar authorizes before anything is created. */
export async function issueByIssuer(
  s: Services,
  orgId: string,
  input: { trustlineId: string; credentialType: string; value: number },
) {
  const org = await getOrg(s, orgId);
  const policy = await s.policy.authorize({
    principal: ref("Issuer", org.id),
    action: "IssueCredential",
    resource: ref("CredentialType", input.credentialType),
    context: {},
    entities: [issuerEntity(org)],
  });
  if (policy.decision !== "ALLOW") {
    return { ok: false as const, policy };
  }
  const holder = await findUserByTrustlineId(s, input.trustlineId);
  if (!holder) throw notFound(`Trustline ${input.trustlineId}`);
  const attribute = getSchema(input.credentialType).headline.attribute;
  const result = await issueCredentialInternal(s, {
    org,
    holder,
    credentialType: input.credentialType,
    values: { [attribute]: input.value },
  });
  return { ok: true as const, policy, ...result };
}

export async function getCredentialMetadata(s: Services, credentialId: string) {
  const metadata = await s.store.get("credentials", credentialId);
  if (!metadata) throw notFound("Credential");
  return metadata;
}

/** Revocation by the issuing organisation or by the holder. */
export async function revokeCredential(
  s: Services,
  actor: { kind: "issuer"; orgId: string } | { kind: "holder"; userId: string },
  credentialId: string,
  reason?: RevocationReason,
): Promise<{ policy: PolicyDecision; metadata?: CredentialMetadata; receipt?: TxReceipt }> {
  const metadata = await getCredentialMetadata(s, credentialId);
  const issuer = await getOrg(s, metadata.issuerId);
  const holder = await getUser(s, metadata.holderUserId);

  const credentialEntity = {
    uid: ref("Credential", metadata.credentialId),
    attrs: { issuer: entity("Issuer", issuer.id), holder: entity("Holder", holder.id) },
    parents: [],
  };
  let principalEntities;
  let principal;
  if (actor.kind === "issuer") {
    const org = await getOrg(s, actor.orgId);
    principal = ref("Issuer", org.id);
    principalEntities = [issuerEntity(org)];
  } else {
    const user = await getUser(s, actor.userId);
    principal = ref("Holder", user.id);
    principalEntities = [holderEntity(user)];
  }
  const policy = await s.policy.authorize({
    principal,
    action: "RevokeCredential",
    resource: credentialEntity.uid,
    context: {},
    entities: [...principalEntities, credentialEntity],
  });
  if (policy.decision !== "ALLOW") return { policy };

  const chainStatus = await s.chain.getCredentialStatus(credentialId);
  if (chainStatus.status === "REVOKED") throw new ServiceError(409, "ALREADY_REVOKED", "Credential is already revoked");

  const revokedAt = nowIso();
  const finalReason: RevocationReason = reason ?? (actor.kind === "issuer" ? "ISSUER_CORRECTION" : "HOLDER_WITHDRAWN");
  const payload = { action: "REVOKE" as const, credentialId, reason: finalReason, revokedAt };
  const message = revocationSigningMessage(payload);
  let request: RevocationRequest;
  if (actor.kind === "issuer") {
    request = { ...payload, authorization: { by: "issuer", signature: signMessage(issuerSecretKey(issuer), message) } };
  } else {
    const wallet = await getWalletEntry(s, holder.id, credentialId);
    request = {
      ...payload,
      authorization: {
        by: "holder",
        holderPublicKey: holder.holderPublicKey,
        subjectSalt: wallet.subjectSalt,
        signature: signMessage(holderSecretKey(holder), message),
      },
    };
  }
  const receipt = await s.chain.revokeCredential(request);

  const updated: CredentialMetadata = {
    ...metadata,
    status: "REVOKED",
    revokedAt,
    revocationTxId: receipt.txId,
    revocationReason: finalReason,
  };
  await s.store.put("credentials", updated);
  const title = describeCredential(metadata.credentialType, metadata.category).title;
  await recordActivity(s, {
    ownerId: holder.id,
    kind: "credential_revoked",
    actor: actor.kind === "issuer" ? issuer.name : "You",
    title: `Revoked: ${title}`,
    detail: "Future verification using this credential will fail.",
    ref: { type: "credential", id: credentialId },
  });
  if (actor.kind === "issuer") {
    await recordActivity(s, {
      ownerId: issuer.id,
      kind: "credential_revoked",
      actor: issuer.name,
      title: `Revoked ${title.toLowerCase()} for ${holder.trustlineId}`,
      ref: { type: "credential", id: credentialId },
    });
  }
  return { policy, metadata: updated, receipt };
}

// ── Holder views ───────────────────────────────────────────────────────────

export interface HolderCredentialView {
  credentialId: string;
  credentialType: string;
  title: string;
  category: string;
  issuerId: string;
  issuerName: string;
  issuerMonogram: string;
  issuerTone: OrganizationRecord["tone"];
  headline: { value: number; noun: string; text: string };
  attributes: { key: string; label: string; value: number }[];
  status: CredentialMetadata["status"];
  chainStatus: string;
  issuedAt: string;
  revokedAt?: string;
  blockchainTxId: string;
  blockNumber: number;
  revocationTxId?: string;
  claimCommitment: string;
  subjectCommitment: string;
  attributeCommitmentCount: number;
  source?: CredentialMetadata["source"];
  hasEvidence: boolean;
}

/** Holder-only: decrypts wallet openings so the holder can see their own values. */
export async function listHolderCredentials(s: Services, userId: string): Promise<HolderCredentialView[]> {
  const [metas, orgs] = await Promise.all([s.store.query("credentials", "holderUserId", userId), listOrgs(s)]);
  const orgById = new Map(orgs.map((o) => [o.id, o]));
  const views: HolderCredentialView[] = [];
  for (const m of metas.sort(byNewest)) {
    const schema = getSchema(m.credentialType);
    const described = describeCredential(m.credentialType, m.category);
    const { openings } = await getWalletEntry(s, userId, m.credentialId);
    const values = Object.fromEntries(Object.entries(openings).map(([k, o]) => [k, o.value]));
    const chain = await s.chain.getCredentialStatus(m.credentialId);
    const org = orgById.get(m.issuerId);
    views.push({
      credentialId: m.credentialId,
      credentialType: m.credentialType,
      title: described.title,
      category: m.category ?? schema.category,
      issuerId: m.issuerId,
      issuerName: org?.name ?? m.issuerId,
      issuerMonogram: org?.monogram ?? "?",
      issuerTone: org?.tone ?? "slate",
      headline: headlineFor(m.credentialType, values, m.category),
      attributes: schema.attributes.map((a) => ({ key: a.key, label: a.label, value: values[a.key] ?? 0 })),
      status: chain.status === "REVOKED" ? "REVOKED" : m.status,
      chainStatus: chain.status,
      issuedAt: m.issuedAt,
      revokedAt: m.revokedAt,
      blockchainTxId: m.blockchainTxId,
      blockNumber: m.blockNumber,
      revocationTxId: m.revocationTxId,
      claimCommitment: m.claimCommitment,
      subjectCommitment: m.subjectCommitment,
      attributeCommitmentCount: Object.keys(m.attributeCommitments).length,
      source: m.source,
      hasEvidence: Boolean(m.evidenceRef),
    });
  }
  return views;
}

export function toReputationInput(views: HolderCredentialView[]): CredentialValues[] {
  return views.map((v) => ({
    credentialId: v.credentialId,
    credentialType: v.credentialType,
    issuerName: v.issuerName,
    status: v.status,
    values: Object.fromEntries(v.attributes.map((a) => [a.key, a.value])),
  }));
}

/** Issuer console view: metadata only, never values. */
export async function listIssuedCredentials(s: Services, orgId: string) {
  const metas = await s.store.query("credentials", "issuerId", orgId);
  const users = await s.store.all("users");
  const tl = new Map(users.map((u) => [u.id, u.trustlineId]));
  return metas.sort(byNewest).map((m) => ({
    credentialId: m.credentialId,
    credentialType: m.credentialType,
    title: describeCredential(m.credentialType, m.category).title,
    trustlineId: tl.get(m.holderUserId) ?? "—",
    status: m.status,
    issuedAt: m.issuedAt,
    revokedAt: m.revokedAt,
    blockchainTxId: m.blockchainTxId,
    revocationTxId: m.revocationTxId,
    claimCommitment: m.claimCommitment,
  }));
}

export async function issuerStats(s: Services, org: OrganizationRecord) {
  const metas = await s.store.query("credentials", "issuerId", org.id);
  const liveRevoked = metas.filter((m) => m.status === "REVOKED").length;
  const issued = org.historical.issued + metas.length;
  const revoked = org.historical.revoked + liveRevoked;
  return { issued, revoked, active: issued - revoked, onLedger: metas.length };
}

export function assertHolder(metadata: CredentialMetadata, userId: string) {
  if (metadata.holderUserId !== userId) throw forbidden();
}

export function assertIssuableType(type: string) {
  try {
    getSchema(type);
  } catch {
    throw badRequest("Unknown credential type");
  }
}
