# Trustline chaincode (Hyperledger Fabric)

Node.js chaincode for the Trustline credential registry.

| Function | Type | Purpose |
| --- | --- | --- |
| `registerIssuer(issuerJson)` | submit | Register an issuer's id, name, Ed25519 public key and permitted credential types. Restricted to `TRUSTLINE_ADMIN_MSP` when set. |
| `issueCredential(credentialJson)` | submit | Anchor a credential: whitelisted fields only, issuer must be registered for the type, issuer signature verified in chaincode. |
| `getCredential(id)` | evaluate | Read the public record. |
| `verifyCredential(id, claimCommitment)` | evaluate | Exists, active, issuer registered, signature valid, commitment matches. |
| `revokeCredential(revocationJson)` | submit | Revocation signed by the issuer, or by the holder proving key ↔ subject commitment. |
| `getCredentialStatus(id)` | evaluate | `ACTIVE` / `REVOKED` / `NOT_FOUND` with timestamps. |

The rules live in `src/logic.ts`, which has no Fabric dependency; `src/contract.ts` adapts it to
`fabric-contract-api`. The Trustline app's local ledger executes the same `logic.ts`, so local and Fabric
behaviour match.

Stored record (example):

```json
{
  "docType": "credential",
  "credentialId": "cred_9f2c…",
  "issuerId": "org_marketplace_a",
  "subjectCommitment": "3b7e…(sha256)",
  "credentialType": "MARKETPLACE_REPUTATION",
  "claimCommitment": "a91d…(sha256 of attribute commitments)",
  "issuedAt": "2026-09-19T10:00:00.000Z",
  "issuerSignature": "…(ed25519)",
  "status": "ACTIVE"
}
```

No values (e.g. `47`), names, contacts or transaction history are ever stored.

## Build and deploy

```bash
cd contracts/trustline-chaincode
npm install
npm run build
# package with the Fabric peer CLI, e.g.
peer lifecycle chaincode package trustline.tar.gz --path . --lang node --label trustline_1
```

Install, approve and commit on your Amazon Managed Blockchain channel following the standard Fabric 2.x
lifecycle, then set the `FABRIC_*` variables for the app.
