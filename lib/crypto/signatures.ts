import { ed25519 } from "@noble/curves/ed25519.js";
import { bytesToHex, hexToBytes, sha256Hex, utf8ToBytes } from "./encoding";
import { sha256 } from "@noble/hashes/sha2.js";

export interface KeyPair {
  secretKey: string;
  publicKey: string;
}

export function keyPairFromSeed(seed: string): KeyPair {
  const secret = sha256(utf8ToBytes(seed));
  return { secretKey: bytesToHex(secret), publicKey: bytesToHex(ed25519.getPublicKey(secret)) };
}

export function generateKeyPair(): KeyPair {
  const { secretKey, publicKey } = ed25519.keygen();
  return { secretKey: bytesToHex(secretKey), publicKey: bytesToHex(publicKey) };
}

export function publicKeyFromSecret(secretKeyHex: string): string {
  return bytesToHex(ed25519.getPublicKey(hexToBytes(secretKeyHex)));
}

export function signMessage(secretKeyHex: string, message: string): string {
  return bytesToHex(ed25519.sign(utf8ToBytes(message), hexToBytes(secretKeyHex)));
}

export function verifyMessage(publicKeyHex: string, message: string, signatureHex: string): boolean {
  try {
    return ed25519.verify(hexToBytes(signatureHex), utf8ToBytes(message), hexToBytes(publicKeyHex));
  } catch {
    return false;
  }
}

/** Crypto primitives handed to the chaincode logic when it runs off-Fabric. */
export const chaincodeCrypto = {
  verifyEd25519: verifyMessage,
  sha256Hex: (message: string) => sha256Hex(message),
};
