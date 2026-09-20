# Trustline architecture

## Request path

```
Frontend (Next.js App Router, React, Tailwind, Framer Motion)
   │  same-origin fetch, HTTP-only session cookies
   ▼
API Gateway            (production)   ─ local: Next.js dev server
   ▼
AWS Lambda             app/api/**/route.ts  →  lib/services/*
   │
   ├─► Amazon Cognito ............... who is signed in to the app (AUTH_MODE=cognito)
   ├─► Strands agent (Lambda+Bedrock)  natural language → structured request (untrusted)
   ├─► Cedar ........................ ALLOW / DENY  (local WASM engine | Amazon Verified Permissions)
   ├─► Crypto (in-process) .......... signatures, commitments, ZK proofs
   ├─► Blockchain adapter ........... local ledger | Hyperledger Fabric (Amazon Managed Blockchain)
   ├─► Amazon DynamoDB .............. application state
   └─► Amazon S3 .................... sealed evidence
```

Every route handler follows the same shape: authenticate (`lib/auth/guards.ts`) → validate input with zod
(`lib/validation/schemas.ts`) → call a service → the service asks Cedar before any protected action.

## Module map

| Path | Responsibility |
| --- | --- |
| `contracts/trustline-chaincode/src/logic.ts` | Chaincode rules, framework-free. Used by Fabric **and** the local ledger. |
| `contracts/trustline-chaincode/src/contract.ts` | `fabric-contract-api` wrapper (tx timestamps, MSP checks). |
| `lib/blockchain/interface.ts` | `BlockchainAdapter`: `registerIssuer`, `issueCredential`, `verifyCredential`, `revokeCredential`, `getCredentialStatus` (+ reads). |
| `lib/blockchain/localAdapter.ts` | Hash-linked, deterministic ledger in `.data/ledger.json`, serialised writes, rollback on failure. |
| `lib/blockchain/fabricAdapter.ts` | Fabric Gateway client: endorse → submit → commit status → real tx id. |
| `lib/crypto/*` | Canonical JSON, Ed25519, Pedersen commitments, range proofs, AES-GCM sealing, identity derivation. |
| `lib/credentials/*` | Schemas, claim predicates, credential building, presentation creation and verification. |
| `lib/aws/cedar/*` | Schema + policies, local engine (cedar-wasm), AVP engine. |
| `lib/aws/strands/*` | Interpreter interface, local deterministic interpreter, Strands HTTP client. |
| `lib/aws/dynamodb`, `lib/aws/s3`, `lib/aws/cognito` | AWS adapters. |
| `lib/data/*` | `DocumentStore` interface + local JSON store. |
| `lib/reputation/engine.ts` | Transparent, deterministic metrics with formulas and inputs. |
| `lib/services/*` | Business logic: wallet, credentials, verification, marketplace, trust summaries, activity. |
| `lib/platforms/*` | `PlatformAdapter` interface; `demoMarketplaceAdapter` (CityStay). |
| `services/strands-agent` | Python Strands agent (Bedrock), Lambda handler. |
| `infra/` | SAM template, exported Cedar schema/policies. |
| `extension/` | Chrome MV3 extension prototype. |

## Identities

Two identities are deliberately kept apart:

| | Application identity | Trustline identity |
| --- | --- | --- |
| Purpose | Sign in to the app | Hold and prove reputation |
| Material | Cognito user (`sub`, email) → internal user id | Ed25519 holder key pair |
| Public form | none | `TL-XXXX` = first 4 hex of `sha256("trustline-id:v1:" ‖ publicKey)` |
| Seen by verifiers | never | the Trustline ID they asked about |

Credentials are bound to the holder key by a per-credential **subject commitment**
`sha256("trustline:subject:v1:" ‖ holderPublicKey ‖ ":" ‖ salt)`. Because the salt differs per credential,
the ledger cannot link a person's credentials to each other.

## Information placement

### ON-CHAIN (shared ledger, readable by every network member)

- **Issuer information:** issuer id, display name, Ed25519 public key, permitted credential types, status.
- **Credential metadata:** credential id, credential type, issuer id, issued-at timestamp.
- **Commitments:** subject commitment (hash), claim commitment (hash over attribute Pedersen commitments).
- **Integrity:** issuer signature over the canonical credential record.
- **Revocation:** status (`ACTIVE`/`REVOKED`), revoked-at, reason code, revoked-by (`issuer`/`holder`).

The chaincode rejects any credential record with fields outside this whitelist (`FIELD_NOT_ALLOWED`), and a
test asserts ledger payloads never contain values, names or holder keys.

### OFF-CHAIN

- **Private information (holder wallet, sealed AES-256-GCM):** holder secret key, per-attribute values and
  blinding factors ("openings"), subject salts.
- **Application state (DynamoDB / local store):** users (display name, Trustline ID, sealed key), organisations,
  credential metadata (commitments, tx ids — no values), verification requests and results, bookings,
  activity, interpretations.
- **Encrypted evidence (S3 SSE-KMS / sealed local files):** the two-sided feedback behind an outcome
  credential. Referenced by `evidenceRef` in metadata; never public; never on-chain.

### NEVER STORED ON-CHAIN

Plaintext private transaction history, transaction values, names, phone numbers, emails, addresses,
government IDs, payment information, or private reputation details.

## Issuance

```
Issuer console / CityStay feedback
  → Cedar: IssueCredential (issuer registered for this type?)
  → build: values → Pedersen commitments (random blindings) → claim root → subject commitment → Ed25519 sign
  → ledger: issueCredential (chaincode re-checks issuer, type, signature, field whitelist)
  → store metadata (commitments + tx id) ; seal openings into the holder wallet ; seal evidence (S3)
  → activity for holder and issuer
```

## Verification

```
Verifier text ─► Strands agent ─► structured request (zod-validated)
             ─► Cedar: RequestPredicateProof | RequestFullHistory | RequestIdentity | RequestRawValue
                 DENY  → request recorded as DENIED_BY_POLICY, holder notified, nothing disclosed
                 ALLOW → request PENDING for the holder
Holder approves ─► Cedar: ApproveVerification (subject == principal, status == PENDING)
Wallet ─► picks an ACTIVE credential that satisfies the predicate
       ─► ledger status check (revoked → FAILED, nothing proven)
       ─► presentation: commitments + holder-binding signature + ZK range proof on Σaᵢ·Cᵢ − t·G
Verifier checks ─► ledger record (exists, ACTIVE, issuer registered, issuer signature)
                ─► claim root(commitments) == on-chain claim commitment
                ─► holder binding (TL ID ← key, subject commitment, signature over nonce)
                ─► range proof
Result ─► VERIFIED / NOT_SATISFIED / FAILED, with per-check booleans; disclosed: identity ✗ history ✗ values ✗
```

## Reputation

`lib/reputation/engine.ts` computes context-specific metrics from **active** credentials only:

| Context | Metric | Formula |
| --- | --- | --- |
| Buyer | Booking reliability | completed ÷ (completed + no-shows) |
| Buyer | Payment reliability | payments completed ÷ completed |
| Buyer | Cancellation behaviour | (total − cancellations) ÷ total |
| Seller | Transaction completion | completed ÷ accepted |
| Seller | Customer satisfaction | positive outcomes ÷ accepted |
| Seller | Dispute rate | disputes ÷ accepted → Low (< 5%) / Moderate (< 15%) / High |

Every metric carries its formula, inputs and source issuers; the UI exposes them on tap.

## Authorization matrix (Cedar)

| Principal | Action | Resource | Rule |
| --- | --- | --- | --- |
| Verifier | RequestPredicateProof | Claim | registered ∧ supported ∧ `>=` ∧ threshold ≥ 1 ∧ purpose ∈ allowed ∧ result-only |
| any | RequestFullHistory / RequestIdentity / RequestRawValue | any | **forbid** |
| unregistered Verifier | any | any | **forbid** |
| Holder | ApproveVerification | VerificationRequest | subject == principal ∧ status == PENDING |
| Issuer | IssueCredential | CredentialType | registered ∧ type ∈ allowedCredentialTypes |
| Issuer | RevokeCredential | Credential | credential.issuer == principal |
| Holder | RevokeCredential | Credential | credential.holder == principal |

## Deployment notes

- `infra/template.yaml` provisions KMS, Secrets Manager, DynamoDB, S3, Cognito, the Verified Permissions
  policy store, the Strands agent Lambda + HTTP API, a least-privilege app role, and (opt-in) an Amazon
  Managed Blockchain Fabric member and peer.
- Upload Cedar policies with `scripts/upload-avp.sh` and set `AVP_POLICY_MAP` from its output.
- Package and install the chaincode from `contracts/trustline-chaincode` on the Fabric channel, then set the
  `FABRIC_*` variables.
- The Next.js app runs on Lambda via OpenNext or AWS Amplify Hosting; it is stateless apart from the
  configured stores, so any number of instances can serve traffic when `DATA_MODE=dynamodb` and
  `BLOCKCHAIN_MODE=fabric`. (The local ledger and local store are single-process only.)
