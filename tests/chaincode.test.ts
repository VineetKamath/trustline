import { describe, expect, it } from "vitest";
import { LocalBlockchainAdapter } from "@/lib/blockchain/localAdapter";
import { buildCredential } from "@/lib/credentials/crypto";
import { keyPairFromSeed } from "@/lib/crypto/signatures";
import { revocationSigningMessage } from "@/contracts/trustline-chaincode/src/logic";
import { signMessage } from "@/lib/crypto/signatures";

const issuer = keyPairFromSeed("test-issuer");
const other = keyPairFromSeed("test-other");
const holder = keyPairFromSeed("test-holder");

async function setup() {
  const chain = new LocalBlockchainAdapter(null);
  await chain.registerIssuer({
    issuerId: "org_test",
    name: "Test Issuer",
    publicKey: issuer.publicKey,
    credentialTypes: ["SUCCESSFUL_TRANSACTION_COUNT"],
    registeredAt: new Date().toISOString(),
  });
  const built = buildCredential({
    credentialId: "cred_test_1",
    issuerId: "org_test",
    issuerSecretKey: issuer.secretKey,
    holderPublicKey: holder.publicKey,
    credentialType: "SUCCESSFUL_TRANSACTION_COUNT",
    values: { successful_transactions: 47 },
    issuedAt: new Date().toISOString(),
  });
  return { chain, built };
}

describe("chaincode — credential issuance", () => {
  it("issues a credential signed by a registered issuer", async () => {
    const { chain, built } = await setup();
    const receipt = await chain.issueCredential(built.ledgerRecord);
    expect(receipt.txId).toMatch(/^[0-9a-f]{64}$/);
    const v = await chain.verifyCredential("cred_test_1", built.ledgerRecord.claimCommitment);
    expect(v.valid).toBe(true);
    expect(chain.verifyChainIntegrity()).toBe(true);
  });

  it("rejects forged issuer signatures", async () => {
    const { chain, built } = await setup();
    const forged = { ...built.ledgerRecord, issuerSignature: signMessage(other.secretKey, "x").padEnd(128, "0") };
    await expect(chain.issueCredential(forged)).rejects.toThrow(/signature/);
    expect(await chain.height()).toBe(1); // only the issuer registration
  });

  it("rejects credential types the issuer is not registered for", async () => {
    const { chain, built } = await setup();
    await expect(chain.issueCredential({ ...built.ledgerRecord, credentialType: "HOSTING_RECORD" })).rejects.toThrow(
      /may not issue/,
    );
  });

  it("refuses private fields on-chain", async () => {
    const { chain, built } = await setup();
    const leaky = { ...built.ledgerRecord, successful_transactions: 47, holderName: "Vineet" };
    await expect(chain.issueCredential(leaky as typeof built.ledgerRecord)).rejects.toThrow(/may not be stored on-chain/);
  });

  it("never writes plaintext values or personal data into ledger payloads", async () => {
    const { chain, built } = await setup();
    await chain.issueCredential(built.ledgerRecord);
    const txs = await chain.recentTransactions(10);
    const wire = JSON.stringify(txs);
    expect(wire).not.toMatch(/"successful_transactions"|"value"|"blinding"|Vineet|holderPublicKey/);
    expect(wire).not.toContain(holder.publicKey);
    const credTx = txs.find((t) => t.fn === "issueCredential")!;
    expect(Object.keys(credTx.payload).sort()).toEqual(
      ["claimCommitment", "credentialId", "credentialType", "issuedAt", "issuerId", "issuerSignature", "subjectCommitment"].sort(),
    );
  });
});

describe("chaincode — revocation", () => {
  it("only the issuer (or holder) can revoke, and status becomes REVOKED", async () => {
    const { chain, built } = await setup();
    await chain.issueCredential(built.ledgerRecord);
    const payload = { action: "REVOKE" as const, credentialId: "cred_test_1", reason: "ISSUER_CORRECTION" as const, revokedAt: new Date().toISOString() };
    const msg = revocationSigningMessage(payload);
    await expect(
      chain.revokeCredential({ ...payload, authorization: { by: "issuer", signature: signMessage(other.secretKey, msg) } }),
    ).rejects.toThrow(/signed by the credential issuer/);
    await chain.revokeCredential({ ...payload, authorization: { by: "issuer", signature: signMessage(issuer.secretKey, msg) } });
    expect((await chain.getCredentialStatus("cred_test_1")).status).toBe("REVOKED");
    const v = await chain.verifyCredential("cred_test_1");
    expect(v.valid).toBe(false);
    await expect(
      chain.revokeCredential({ ...payload, authorization: { by: "issuer", signature: signMessage(issuer.secretKey, msg) } }),
    ).rejects.toThrow(/already revoked/);
  });

  it("holder can withdraw with key + salt proving they are the subject", async () => {
    const { chain, built } = await setup();
    await chain.issueCredential(built.ledgerRecord);
    const payload = { action: "REVOKE" as const, credentialId: "cred_test_1", reason: "HOLDER_WITHDRAWN" as const, revokedAt: new Date().toISOString() };
    const msg = revocationSigningMessage(payload);
    await expect(
      chain.revokeCredential({
        ...payload,
        authorization: { by: "holder", holderPublicKey: other.publicKey, subjectSalt: built.subjectSalt, signature: signMessage(other.secretKey, msg) },
      }),
    ).rejects.toThrow(/does not match/);
    await chain.revokeCredential({
      ...payload,
      authorization: { by: "holder", holderPublicKey: holder.publicKey, subjectSalt: built.subjectSalt, signature: signMessage(holder.secretKey, msg) },
    });
    expect((await chain.getCredentialStatus("cred_test_1")).status).toBe("REVOKED");
  });
});
