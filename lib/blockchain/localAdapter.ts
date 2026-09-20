import fs from "node:fs";
import path from "node:path";
import { TrustlineChaincode, type WorldState } from "@/contracts/trustline-chaincode/src/logic";
import type { CredentialSigningPayload } from "@/contracts/trustline-chaincode/src/types";
import { canonicalize, sha256Hex } from "@/lib/crypto/encoding";
import { chaincodeCrypto } from "@/lib/crypto/signatures";
import type {
  BlockchainAdapter,
  CredentialStatusView,
  IssuerRegistration,
  LedgerTransactionView,
  RevocationRequest,
  TxReceipt,
} from "./interface";

interface Block {
  number: number;
  previousHash: string;
  hash: string;
  timestamp: string;
  tx: { txId: string; fn: string; payload: Record<string, unknown> };
}

interface LedgerFile {
  network: string;
  blocks: Block[];
  state: Record<string, string>;
}

const GENESIS_HASH = "0".repeat(64);

/**
 * Deterministic, hash-linked local ledger.
 *
 * Each write executes the real Trustline chaincode logic against an in-process
 * world state, then appends a block whose hash commits to the previous block
 * and the transaction payload. Transaction IDs are derived from the payload
 * and chain height, so identical histories always produce identical IDs.
 */
export class LocalBlockchainAdapter implements BlockchainAdapter {
  readonly mode = "local" as const;
  readonly networkName = "trustline-local";
  private ledger: LedgerFile;
  private chaincode: TrustlineChaincode;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly filePath: string | null) {
    this.ledger = this.load();
    const state = this.ledger.state;
    const world: WorldState = {
      get: async (key) => state[key],
      put: async (key, value) => {
        state[key] = value;
      },
    };
    this.chaincode = new TrustlineChaincode(world, chaincodeCrypto);
  }

  private load(): LedgerFile {
    if (this.filePath && fs.existsSync(this.filePath)) {
      try {
        return JSON.parse(fs.readFileSync(this.filePath, "utf8")) as LedgerFile;
      } catch {
        // fall through to a fresh ledger
      }
    }
    return { network: this.networkName, blocks: [], state: {} };
  }

  private persist() {
    if (!this.filePath) return;
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.ledger));
    fs.renameSync(tmp, this.filePath);
  }

  reset() {
    this.ledger.blocks = [];
    for (const key of Object.keys(this.ledger.state)) delete this.ledger.state[key];
    this.persist();
  }

  /** Serialises writes, like an ordering service with a single channel. */
  private submit<T>(fn: string, payload: Record<string, unknown>, execute: () => Promise<T>): Promise<TxReceipt> {
    const run = async () => {
      const snapshot = { ...this.ledger.state };
      try {
        await execute();
      } catch (error) {
        // Roll back world-state changes from a failed transaction.
        for (const key of Object.keys(this.ledger.state)) delete this.ledger.state[key];
        Object.assign(this.ledger.state, snapshot);
        throw error;
      }
      const number = this.ledger.blocks.length;
      const previousHash = number === 0 ? GENESIS_HASH : this.ledger.blocks[number - 1].hash;
      const txId = sha256Hex(canonicalize({ network: this.networkName, number, fn, payload }));
      const timestamp = new Date().toISOString();
      const hash = sha256Hex(canonicalize({ number, previousHash, txId, fn, payload }));
      this.ledger.blocks.push({ number, previousHash, hash, timestamp, tx: { txId, fn, payload } });
      this.persist();
      return { txId, blockNumber: number, blockHash: hash, confirmedAt: timestamp, network: this.networkName };
    };
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => undefined);
    return result;
  }

  registerIssuer(input: IssuerRegistration) {
    return this.submit("registerIssuer", { ...input }, () => this.chaincode.registerIssuer(input));
  }

  issueCredential(record: CredentialSigningPayload & { issuerSignature: string }) {
    return this.submit("issueCredential", { ...record }, () => this.chaincode.issueCredential(record));
  }

  revokeCredential(request: RevocationRequest) {
    return this.submit("revokeCredential", { ...request }, () => this.chaincode.revokeCredential(request));
  }

  verifyCredential(credentialId: string, claimCommitment?: string) {
    return this.chaincode.verifyCredential(credentialId, claimCommitment);
  }

  async getCredentialStatus(credentialId: string): Promise<CredentialStatusView> {
    return this.chaincode.getCredentialStatus(credentialId);
  }

  getCredential(credentialId: string) {
    return this.chaincode.getCredential(credentialId);
  }

  getIssuer(issuerId: string) {
    return this.chaincode.getIssuer(issuerId);
  }

  async recentTransactions(limit: number): Promise<LedgerTransactionView[]> {
    return this.ledger.blocks
      .slice(-limit)
      .reverse()
      .map((b) => ({
        txId: b.tx.txId,
        blockNumber: b.number,
        blockHash: b.hash,
        previousHash: b.previousHash,
        fn: b.tx.fn,
        timestamp: b.timestamp,
        payload: b.tx.payload,
      }));
  }

  async height() {
    return this.ledger.blocks.length;
  }

  /** Recomputes every block hash; used by tests and the ledger explorer. */
  verifyChainIntegrity(): boolean {
    let previousHash = GENESIS_HASH;
    for (const block of this.ledger.blocks) {
      const expected = sha256Hex(
        canonicalize({ number: block.number, previousHash, txId: block.tx.txId, fn: block.tx.fn, payload: block.tx.payload }),
      );
      if (block.previousHash !== previousHash || block.hash !== expected) return false;
      previousHash = block.hash;
    }
    return true;
  }
}
