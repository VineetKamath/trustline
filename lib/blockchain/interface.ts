import type {
  CredentialSigningPayload,
  CredentialVerification,
  LedgerCredential,
  LedgerCredentialStatus,
  LedgerIssuer,
  RevocationReason,
  RevocationRequest,
} from "@/contracts/trustline-chaincode/src/types";

export type {
  CredentialVerification,
  LedgerCredential,
  LedgerIssuer,
  RevocationReason,
  RevocationRequest,
};

export interface TxReceipt {
  txId: string;
  blockNumber: number;
  blockHash?: string;
  confirmedAt: string;
  network: string;
}

export interface IssuerRegistration {
  issuerId: string;
  name: string;
  publicKey: string;
  credentialTypes: string[];
  registeredAt: string;
}

export interface CredentialStatusView {
  credentialId: string;
  status: LedgerCredentialStatus | "NOT_FOUND";
  issuerId?: string;
  issuedAt?: string;
  revokedAt?: string;
  revocationReason?: RevocationReason;
}

export interface LedgerTransactionView {
  txId: string;
  blockNumber: number;
  blockHash: string;
  previousHash: string;
  fn: string;
  timestamp: string;
  /** The exact public payload written to the ledger. */
  payload: Record<string, unknown>;
}

/**
 * Single interface used by the whole application. The UI and services never
 * know whether they are talking to the local ledger or to Hyperledger Fabric.
 */
export interface BlockchainAdapter {
  readonly mode: "local" | "fabric";
  readonly networkName: string;

  registerIssuer(input: IssuerRegistration): Promise<TxReceipt>;
  issueCredential(record: CredentialSigningPayload & { issuerSignature: string }): Promise<TxReceipt>;
  verifyCredential(credentialId: string, claimCommitment?: string): Promise<CredentialVerification>;
  revokeCredential(request: RevocationRequest): Promise<TxReceipt>;
  getCredentialStatus(credentialId: string): Promise<CredentialStatusView>;

  getCredential(credentialId: string): Promise<LedgerCredential | null>;
  getIssuer(issuerId: string): Promise<LedgerIssuer | null>;

  /** Recent ledger transactions (best effort; used by the ledger explorer). */
  recentTransactions(limit: number): Promise<LedgerTransactionView[]>;
  height(): Promise<number>;
}
