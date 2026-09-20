import "server-only";
import { entity, ref, type CedarEntity } from "@/lib/aws/cedar";
import { open, seal } from "@/lib/crypto/secretBox";
import { keyPairFromSeed } from "@/lib/crypto/signatures";
import type { OrganizationRecord, UserRecord } from "@/types";
import type { Services } from "./context";
import { notFound } from "./errors";
import { nowIso } from "./util";

const issuerAad = (orgId: string) => `issuer-key:${orgId}`;

export async function getOrg(s: Services, orgId: string) {
  const org = await s.store.get("organizations", orgId);
  if (!org) throw notFound("Organisation");
  return org;
}

export async function listOrgs(s: Services) {
  return s.store.all("organizations");
}

export function issuerSecretKey(org: OrganizationRecord): string {
  if (!org.issuerKeySealed) throw new Error(`${org.name} has no issuer key`);
  return open<string>(org.issuerKeySealed, issuerAad(org.id));
}

/**
 * Creates an organisation and, for issuers, registers its signing key on the
 * ledger. In production issuer keys live in AWS KMS / the issuer's own HSM.
 */
export async function createOrganization(
  s: Services,
  input: Omit<OrganizationRecord, "issuerPublicKey" | "issuerKeySealed">,
  at = nowIso(),
) {
  const org: OrganizationRecord = { ...input };
  if (org.roles.includes("issuer")) {
    const keys = keyPairFromSeed(`trustline-demo-issuer:${org.id}`);
    org.issuerPublicKey = keys.publicKey;
    org.issuerKeySealed = seal(keys.secretKey, issuerAad(org.id));
    const existing = await s.chain.getIssuer(org.id);
    if (!existing) {
      await s.chain.registerIssuer({
        issuerId: org.id,
        name: org.name,
        publicKey: keys.publicKey,
        credentialTypes: org.allowedCredentialTypes,
        registeredAt: at,
      });
    }
  }
  await s.store.put("organizations", org);
  return org;
}

// ── Cedar entity builders ──────────────────────────────────────────────────

export function verifierEntity(org: OrganizationRecord): CedarEntity {
  return {
    uid: ref("Verifier", org.id),
    attrs: {
      registered: org.registered && org.roles.includes("verifier"),
      allowedPurposes: org.allowedPurposes,
    },
    parents: [],
  };
}

export function issuerEntity(org: OrganizationRecord): CedarEntity {
  return {
    uid: ref("Issuer", org.id),
    attrs: {
      registered: org.registered && org.roles.includes("issuer"),
      allowedCredentialTypes: org.allowedCredentialTypes.map((t) => entity("CredentialType", t)),
    },
    parents: [],
  };
}

export function holderEntity(user: UserRecord): CedarEntity {
  return { uid: ref("Holder", user.id), attrs: { trustlineId: user.trustlineId }, parents: [] };
}
