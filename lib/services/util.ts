import { randomHex } from "@/lib/crypto/encoding";

export const newId = (prefix: string) => `${prefix}_${randomHex(8)}`;
export const nowIso = () => new Date().toISOString();

export function byNewest<T extends { createdAt?: string; issuedAt?: string }>(a: T, b: T) {
  const ta = a.createdAt ?? a.issuedAt ?? "";
  const tb = b.createdAt ?? b.issuedAt ?? "";
  return ta < tb ? 1 : ta > tb ? -1 : 0;
}
