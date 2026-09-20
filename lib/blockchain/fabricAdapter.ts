import fs from "node:fs/promises";
import { createPrivateKey } from "node:crypto";
import type { CredentialSigningPayload } from "@/contracts/trustline-chaincode/src/types";
import { config } from "@/lib/config";
import type {
  BlockchainAdapter,
  CredentialStatusView,
  CredentialVerification,
  IssuerRegistration,
  LedgerCredential,
  LedgerIssuer,
  LedgerTransactionView,
  RevocationRequest,
  TxReceipt,
} from "./interface";

type Contract = import("@hyperledger/fabric-gateway").Contract;

/**
 * Hyperledger Fabric adapter (Amazon Managed Blockchain or any Fabric 2.x
 * network) using the Fabric Gateway client API.
 *
 * Required environment:
 *   FABRIC_PEER_ENDPOINT   e.g. nd-xxxx.m-xxxx.n-xxxx.managedblockchain.ap-south-1.amazonaws.com:30003
 *   FABRIC_PEER_HOST_ALIAS TLS host name override (optional)
 *   FABRIC_TLS_CERT_PATH   managed blockchain TLS CA certificate (PEM)
 *   FABRIC_MSP_ID          member MSP id
 *   FABRIC_CERT_PATH       enrolled identity certificate (PEM)
 *   FABRIC_KEY_PATH        enrolled identity private key (PEM)
 *   FABRIC_CHANNEL / FABRIC_CHAINCODE
 *
 * The gRPC and gateway modules are loaded lazily, so local mode never loads them.
 */
export class FabricBlockchainAdapter implements BlockchainAdapter {
  readonly mode = "fabric" as const;
  readonly networkName: string;
  private contractPromise: Promise<Contract> | null = null;

  constructor() {
    this.networkName = `fabric:${config.fabric.channel}`;
  }

  private async contract(): Promise<Contract> {
    if (!this.contractPromise) this.contractPromise = this.connect();
    return this.contractPromise;
  }

  private async connect(): Promise<Contract> {
    const f = config.fabric;
    for (const [name, value] of Object.entries({
      FABRIC_PEER_ENDPOINT: f.peerEndpoint,
      FABRIC_TLS_CERT_PATH: f.tlsCertPath,
      FABRIC_MSP_ID: f.mspId,
      FABRIC_CERT_PATH: f.certPath,
      FABRIC_KEY_PATH: f.keyPath,
    })) {
      if (!value) throw new Error(`${name} must be set when BLOCKCHAIN_MODE=fabric`);
    }
    const grpc = await import("@grpc/grpc-js");
    const { connect, hash, signers } = await import("@hyperledger/fabric-gateway");

    const tlsRootCert = await fs.readFile(f.tlsCertPath);
    const credentials = await fs.readFile(f.certPath);
    const privateKeyPem = await fs.readFile(f.keyPath);

    const client = new grpc.Client(
      f.peerEndpoint,
      grpc.credentials.createSsl(tlsRootCert),
      f.peerHostAlias ? { "grpc.ssl_target_name_override": f.peerHostAlias } : {},
    );
    const gateway = connect({
      client,
      identity: { mspId: f.mspId, credentials },
      signer: signers.newPrivateKeySigner(createPrivateKey(privateKeyPem)),
      hash: hash.sha256,
      evaluateOptions: () => ({ deadline: Date.now() + 5_000 }),
      endorseOptions: () => ({ deadline: Date.now() + 15_000 }),
      submitOptions: () => ({ deadline: Date.now() + 5_000 }),
      commitStatusOptions: () => ({ deadline: Date.now() + 60_000 }),
    });
    return gateway.getNetwork(f.channel).getContract(f.chaincode);
  }

  /** Endorse → submit to ordering → wait for commit, returning the real tx id. */
  private async submit(fn: string, ...args: string[]): Promise<TxReceipt> {
    const contract = await this.contract();
    const proposal = contract.newProposal(fn, { arguments: args });
    const transaction = await proposal.endorse();
    const submitted = await transaction.submit();
    const status = await submitted.getStatus();
    if (!status.successful) {
      throw new Error(`Fabric transaction ${status.transactionId} failed with code ${status.code}`);
    }
    return {
      txId: status.transactionId,
      blockNumber: Number(status.blockNumber),
      confirmedAt: new Date().toISOString(),
      network: this.networkName,
    };
  }

  private async evaluate<T>(fn: string, ...args: string[]): Promise<T> {
    const contract = await this.contract();
    const bytes = await contract.evaluateTransaction(fn, ...args);
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  }

  registerIssuer(input: IssuerRegistration) {
    const { registeredAt: _registeredAt, ...rest } = input;
    void _registeredAt; // the chaincode uses the transaction timestamp instead
    return this.submit("registerIssuer", JSON.stringify(rest));
  }

  issueCredential(record: CredentialSigningPayload & { issuerSignature: string }) {
    return this.submit("issueCredential", JSON.stringify(record));
  }

  revokeCredential(request: RevocationRequest) {
    return this.submit("revokeCredential", JSON.stringify(request));
  }

  verifyCredential(credentialId: string, claimCommitment?: string) {
    return this.evaluate<CredentialVerification>("verifyCredential", credentialId, claimCommitment ?? "");
  }

  getCredentialStatus(credentialId: string) {
    return this.evaluate<CredentialStatusView>("getCredentialStatus", credentialId);
  }

  getCredential(credentialId: string) {
    return this.evaluate<LedgerCredential | null>("getCredential", credentialId);
  }

  getIssuer(issuerId: string) {
    return this.evaluate<LedgerIssuer | null>("getIssuer", issuerId);
  }

  /** Block browsing requires the Fabric block event service; not exposed in this MVP. */
  async recentTransactions(): Promise<LedgerTransactionView[]> {
    return [];
  }

  async height() {
    return -1;
  }
}
