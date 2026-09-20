import { sha256, sha512 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes, randomBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import { canonicalize } from "@/contracts/trustline-chaincode/src/canonical";

export { canonicalize, bytesToHex, hexToBytes, randomBytes, utf8ToBytes };

export function sha256Hex(message: string | Uint8Array): string {
  return bytesToHex(sha256(typeof message === "string" ? utf8ToBytes(message) : message));
}

export function sha512Bytes(message: string | Uint8Array): Uint8Array {
  return sha512(typeof message === "string" ? utf8ToBytes(message) : message);
}

export function randomHex(bytes = 16): string {
  return bytesToHex(randomBytes(bytes));
}

export function bytesToBigIntLE(bytes: Uint8Array): bigint {
  let result = 0n;
  for (let i = bytes.length - 1; i >= 0; i--) result = (result << 8n) | BigInt(bytes[i]);
  return result;
}

export function bigIntToHexLE(value: bigint, length = 32): string {
  const out = new Uint8Array(length);
  let v = value;
  for (let i = 0; i < length; i++) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return bytesToHex(out);
}

export function hexLEToBigInt(hex: string): bigint {
  return bytesToBigIntLE(hexToBytes(hex));
}

export function shortHash(hex: string, head = 6, tail = 4): string {
  if (hex.length <= head + tail + 1) return hex;
  return `${hex.slice(0, head)}…${hex.slice(-tail)}`;
}
