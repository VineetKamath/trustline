import { createHash, createPublicKey, verify } from "node:crypto";
import { Context, Contract, Info, Returns, Transaction } from "fabric-contract-api";
import { ChaincodeError, TrustlineChaincode, type ChaincodeCrypto, type WorldState } from "./logic";
import type { RevocationRequest } from "./types";

const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

const nodeCrypto: ChaincodeCrypto = {
  verifyEd25519(publicKeyHex, message, signatureHex) {
    try {
      const key = createPublicKey({
        key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicKeyHex, "hex")]),
        format: "der",
        type: "spki",
      });
      return verify(null, Buffer.from(message, "utf8"), key, Buffer.from(signatureHex, "hex"));
    } catch {
      return false;
    }
  },
  sha256Hex(message) {
    return createHash("sha256").update(message, "utf8").digest("hex");
  },
};

function worldState(ctx: Context): WorldState {
  return {
    async get(key) {
      const bytes = await ctx.stub.getState(key);
      return bytes && bytes.length > 0 ? Buffer.from(bytes).toString("utf8") : undefined;
    },
    async put(key, value) {
      await ctx.stub.putState(key, Buffer.from(value, "utf8"));
    },
  };
}

/** Uses the transaction timestamp so every endorsing peer computes the same value. */
function txTimestamp(ctx: Context): string {
  const ts = ctx.stub.getTxTimestamp();
  const millis = Number(ts.seconds) * 1000 + Math.floor(ts.nanos / 1_000_000);
  return new Date(millis).toISOString();
}

async function run<T>(fn: () => Promise<T>): Promise<string> {
  try {
    return JSON.stringify(await fn());
  } catch (error) {
    if (error instanceof ChaincodeError) throw new Error(`${error.code}: ${error.message}`);
    throw error;
  }
}

@Info({ title: "TrustlineContract", description: "Cross-platform credential registry for Trustline" })
export class TrustlineContract extends Contract {
  constructor() {
    super("trustline");
  }

  private logic(ctx: Context) {
    return new TrustlineChaincode(worldState(ctx), nodeCrypto);
  }

  /**
   * Issuer registration is restricted to the network admin organisation. In
   * Amazon Managed Blockchain this is the member that owns the channel.
   */
  @Transaction()
  @Returns("string")
  async registerIssuer(ctx: Context, issuerJson: string): Promise<string> {
    const adminMsp = process.env.TRUSTLINE_ADMIN_MSP;
    if (adminMsp && ctx.clientIdentity.getMSPID() !== adminMsp) {
      throw new Error("FORBIDDEN: only the network administrator may register issuers");
    }
    const input = JSON.parse(issuerJson);
    return run(() => this.logic(ctx).registerIssuer({ ...input, registeredAt: txTimestamp(ctx) }));
  }

  @Transaction()
  @Returns("string")
  async issueCredential(ctx: Context, credentialJson: string): Promise<string> {
    return run(() => this.logic(ctx).issueCredential(JSON.parse(credentialJson)));
  }

  @Transaction(false)
  @Returns("string")
  async getCredential(ctx: Context, credentialId: string): Promise<string> {
    return run(() => this.logic(ctx).getCredential(credentialId));
  }

  @Transaction(false)
  @Returns("string")
  async getIssuer(ctx: Context, issuerId: string): Promise<string> {
    return run(() => this.logic(ctx).getIssuer(issuerId));
  }

  @Transaction(false)
  @Returns("string")
  async verifyCredential(ctx: Context, credentialId: string, claimCommitment: string): Promise<string> {
    return run(() => this.logic(ctx).verifyCredential(credentialId, claimCommitment || undefined));
  }

  @Transaction()
  @Returns("string")
  async revokeCredential(ctx: Context, revocationJson: string): Promise<string> {
    return run(() => this.logic(ctx).revokeCredential(JSON.parse(revocationJson) as RevocationRequest));
  }

  @Transaction(false)
  @Returns("string")
  async getCredentialStatus(ctx: Context, credentialId: string): Promise<string> {
    return run(() => this.logic(ctx).getCredentialStatus(credentialId));
  }
}
