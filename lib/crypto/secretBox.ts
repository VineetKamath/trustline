import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { config } from "@/lib/config";

/**
 * AES-256-GCM envelope used to keep holder secrets (wallet keys and credential
 * openings) encrypted at rest in the application store. In production the key
 * comes from AWS KMS / Secrets Manager; in local demo mode it is derived from
 * WALLET_ENCRYPTION_KEY or a fixed development value.
 */
function key(): Buffer {
  return createHash("sha256").update(`trustline-wallet:${config.walletEncryptionKey}`).digest();
}

export function seal(plaintext: unknown, associatedData: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(associatedData, "utf8"));
  const body = Buffer.concat([cipher.update(JSON.stringify(plaintext), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${body.toString("base64url")}.${tag.toString("base64url")}`;
}

export function open<T>(sealed: string, associatedData: string): T {
  const [version, iv, body, tag] = sealed.split(".");
  if (version !== "v1" || !iv || !body || !tag) throw new Error("Malformed sealed value");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from(associatedData, "utf8"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  const plain = Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]);
  return JSON.parse(plain.toString("utf8")) as T;
}
