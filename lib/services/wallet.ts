import "server-only";
import { deriveTrustlineId } from "@/lib/crypto/identity";
import { open, seal } from "@/lib/crypto/secretBox";
import { generateKeyPair, keyPairFromSeed, type KeyPair } from "@/lib/crypto/signatures";
import type { AttributeOpening, UserRecord, WalletEntry } from "@/types";
import type { Services } from "./context";
import { notFound } from "./errors";
import { newId, nowIso } from "./util";

const holderAad = (userId: string) => `holder-key:${userId}`;
const openingsAad = (credentialId: string) => `openings:${credentialId}`;

export async function createUserWallet(
  s: Services,
  input: {
    displayName: string;
    id?: string;
    seed?: string;
    loginEnabled?: boolean;
    publishedClaims?: string[];
    cognitoSub?: string;
    at?: string;
  },
): Promise<UserRecord> {
  const id = input.id ?? newId("usr");
  let keys: KeyPair;
  let trustlineId: string;
  // Short Trustline IDs are fingerprints; retry on the (rare) collision.
  for (let attempt = 0; ; attempt++) {
    keys = input.seed && attempt === 0 ? keyPairFromSeed(input.seed) : generateKeyPair();
    trustlineId = deriveTrustlineId(keys.publicKey);
    const clash = await s.store.query("users", "trustlineId", trustlineId);
    if (clash.length === 0) break;
    if (attempt > 20) throw new Error("Could not allocate a Trustline ID");
  }
  const user: UserRecord = {
    id,
    displayName: input.displayName,
    trustlineId,
    holderPublicKey: keys.publicKey,
    holderKeySealed: seal(keys.secretKey, holderAad(id)),
    cognitoSub: input.cognitoSub,
    publishedClaims: input.publishedClaims ?? ["booking_reliability", "seller_completion", "verified_credentials"],
    loginEnabled: input.loginEnabled ?? true,
    createdAt: input.at ?? nowIso(),
  };
  await s.store.put("users", user);
  return user;
}

export function holderSecretKey(user: UserRecord): string {
  return open<string>(user.holderKeySealed, holderAad(user.id));
}

export async function getUser(s: Services, userId: string) {
  const user = await s.store.get("users", userId);
  if (!user) throw notFound("User");
  return user;
}

export async function findUserByTrustlineId(s: Services, trustlineId: string) {
  const [user] = await s.store.query("users", "trustlineId", trustlineId.toUpperCase());
  return user ?? null;
}

export async function storeWalletEntry(
  s: Services,
  input: { userId: string; credentialId: string; subjectSalt: string; openings: Record<string, AttributeOpening> },
) {
  const entry: WalletEntry = {
    id: `wal_${input.credentialId}`,
    credentialId: input.credentialId,
    userId: input.userId,
    subjectSalt: input.subjectSalt,
    openingsSealed: seal(input.openings, openingsAad(input.credentialId)),
  };
  await s.store.put("wallet", entry);
  return entry;
}

export async function getWalletEntry(s: Services, userId: string, credentialId: string) {
  const entry = await s.store.get("wallet", `wal_${credentialId}`);
  if (!entry || entry.userId !== userId) throw notFound("Wallet entry");
  return {
    subjectSalt: entry.subjectSalt,
    openings: open<Record<string, AttributeOpening>>(entry.openingsSealed, openingsAad(credentialId)),
  };
}

/** Public view of a user: never includes keys, Cognito identifiers or names. */
export function publicWallet(user: UserRecord) {
  return {
    trustlineId: user.trustlineId,
    holderPublicKey: user.holderPublicKey,
    publishedClaims: user.publishedClaims,
    createdAt: user.createdAt,
  };
}
