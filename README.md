# Trustline

**Your reputation. Not your data.**

Trustline is a privacy-preserving, cross-platform trust layer for online transactions. Platforms issue
verifiable credentials about behaviour (completed bookings, cancellations, disputes). People hold them. Other
platforms can then ask *"has this person completed at least 20 transactions?"* and receive a cryptographically
verified **yes** — without the person's name, their history, or the number 47.

> Don't trust the profile. Verify the behaviour.

This repository is a hackathon MVP. It runs completely locally with `npm install && npm run dev`, with no
AWS account and no blockchain network, and it executes the real flow: signatures, Pedersen commitments,
zero-knowledge range proofs, Cedar authorization, and chaincode rules on a hash-linked ledger.

---

## Contents

- [Problem](#problem) · [Solution](#solution) · [Architecture](#architecture)
- [Privacy model](#privacy-model) · [Blockchain model](#blockchain-model)
- [AWS services](#aws-services) · [Cedar authorization](#cedar-authorization) · [Strands agent](#strands-agent)
- [Local setup](#local-setup) · [Environment variables](#environment-variables) · [Demo credentials](#demo-credentials)
- [Demo flow (3 minutes)](#demo-flow-3-minutes) · [Browser extension](#browser-extension)
- [Testing](#testing) · [Production roadmap](#production-roadmap) · [Limitations](#limitations) · [Security](#security-considerations)

---

## Problem

People transact with strangers constantly — restaurant and hotel bookings, rides, deliveries, marketplace
purchases, rentals, freelance work. Trust breaks on **both** sides:

- Buyers no-show, cancel repeatedly, or aren't present for deliveries.
- Sellers post fake listings, cancel after payment, or never deliver.

Reputation is **fragmented**: years of reliable behaviour on one platform count for nothing on the next, and
each platform only sees a slice of a person's history.

## Solution

1. **Platforms issue credentials** after real transactions. Values are hidden in Pedersen commitments, the
   credential is signed by the issuer, and its commitment + status are anchored on a permissioned ledger.
2. **People hold their reputation.** The Trustline app shows *behavioural categories* (booking reliability,
   payment reliability, cancellation behaviour, seller completion…) with the exact formula and inputs behind
   each number. There is no universal "trust score".
3. **The other side decides.** A booking is a *request* until the provider accepts it. They see the
   customer's published Trustline — reliability, how many credentials, how many revoked, who vouched — and
   accept or decline on that. Declining costs the customer nothing: a request that never became a transaction
   issues no credential and leaves no mark.
4. **Verifiers get proofs, not data.** A verifier describes what it needs in natural language; a Strands
   agent turns that into a structured claim; **Cedar** decides whether the request is allowed; the holder
   approves; the wallet produces a **zero-knowledge proof**; the verifier checks it against the ledger.

## Architecture

```
 Verifier / Holder / Issuer (Next.js, mobile-first)            Browser extension (MV3)
            │                                                          │ public claims only
            ▼                                                          ▼
   Next.js route handlers  ──►  lib/services  (API layer; deployable to AWS Lambda behind API Gateway)
            │
            ├── Auth ............ Amazon Cognito (app login)   ≠   Trustline holder key (reputation identity)
            ├── Interpreter ..... Strands agent on Amazon Bedrock  → structured request (untrusted, schema-validated)
            ├── Authorization ... Cedar (local WASM engine)  |  Amazon Verified Permissions
            ├── Crypto .......... Ed25519 signatures, Pedersen commitments, ZK range proofs (ristretto255)
            ├── Ledger .......... BlockchainAdapter → LocalBlockchainAdapter | FabricBlockchainAdapter
            │                     (same chaincode logic in both: contracts/trustline-chaincode)
            ├── App state ....... LocalDocumentStore | DynamoDB single-table
            └── Evidence ........ sealed files locally | S3 (SSE-KMS, private)
```

Full detail, data placement and trust boundaries: **[ARCHITECTURE.md](ARCHITECTURE.md)**.

## Privacy model

| Data | Where it lives | Who sees it |
| --- | --- | --- |
| Name, email (login) | Cognito / app store | The person only. Never sent to verifiers, never on-chain. |
| Trustline ID (`TL-7F4A`) | Derived from holder public key | Public pseudonym. |
| Credential values (e.g. `47`) and blinding factors | Holder wallet, sealed with AES-256-GCM | Holder only (and the issuer at issuance time). |
| Attribute commitments | Credential metadata + presentations | Anyone given them — they are perfectly hiding. |
| Claim commitment, issuer signature, status | Ledger | Every network member. |
| Feedback evidence | Sealed file / S3 SSE-KMS | Server-side only. |

What a verifier receives for "20+ successful transactions" is a `Presentation` (≈10 KB): the credential id,
the attribute commitments, a holder-binding signature, and a 24-bit range proof. It verifies — and learns
exactly one bit. The verifier console shows this payload verbatim ("Everything you received").

**Proofs.** Each credential attribute is committed as `C = v·G + r·H` on ristretto255 (`H` is hashed to
the curve, so nobody knows `log_G H`). A claim `Σ aᵢ·vᵢ ≥ t` is proven by homomorphically forming
`D = Σ aᵢ·Cᵢ − t·G` and proving `D` opens to a value in `[0, 2²⁴)` via bit decomposition with
Cramer–Damgård–Schoenmakers OR-proofs, made non-interactive with Fiat–Shamir and bound to the request nonce.
The same primitive proves counts (`successful_transactions ≥ 20`) and ratios
(`100·completed − 95·(completed + no_shows) ≥ 0` ⇔ reliability ≥ 95%). See `lib/crypto/rangeProof.ts`.

## Blockchain model

Independent platforms must trust each other's credentials without depending on one central database, so
the source of truth for **who issued what, and whether it is still valid** is a permissioned ledger
(Hyperledger Fabric on Amazon Managed Blockchain in production).

- **On-chain:** issuer registry (id, name, Ed25519 public key, permitted credential types), credential id,
  type, subject commitment `sha256(holderKey ‖ salt)`, claim commitment (hash of attribute commitments),
  issuer signature, issued/revoked timestamps, revocation reason code.
- **Never on-chain:** names, contacts, addresses, IDs, payment data, transaction history, transaction values.
  The chaincode itself **rejects** any credential payload containing non-whitelisted fields.
- **Chaincode** (`contracts/trustline-chaincode`): `registerIssuer`, `issueCredential`, `getCredential`,
  `verifyCredential`, `revokeCredential`, `getCredentialStatus`. Signatures are verified inside the chaincode;
  revocation must be signed by the issuer or by the holder (who proves they are the subject).
- **Local mode** runs the *same* chaincode logic (`contracts/trustline-chaincode/src/logic.ts`) against an
  in-process world state and appends hash-linked blocks to `.data/ledger.json`. Transaction ids are
  deterministic functions of payload and height. `/ledger` shows every payload and verifies the hash chain.

## AWS services

Each service has one job:

| Service | Purpose | Code |
| --- | --- | --- |
| Amazon Cognito | Application login only (separate from the Trustline identity) | `lib/aws/cognito/auth.ts` |
| Amazon Verified Permissions | Cedar policy decisions in production | `lib/aws/cedar/avpEngine.ts` |
| Amazon Bedrock + Strands Agents SDK | Natural language → structured request | `services/strands-agent/agent.py` |
| Amazon DynamoDB | Application state (single table, 2 GSIs, KMS) | `lib/aws/dynamodb/dynamoStore.ts` |
| Amazon S3 | Sealed off-chain evidence, SSE-KMS, public access blocked | `lib/aws/s3/evidenceStore.ts` |
| Amazon Managed Blockchain (Fabric) | Cross-platform credential registry | `lib/blockchain/fabricAdapter.ts` |
| AWS Lambda + API Gateway | Hosting for the API and the agent | `infra/template.yaml` |
| AWS KMS / Secrets Manager | Data keys, session and wallet secrets | `infra/template.yaml` |

`infra/template.yaml` is a SAM **scaffold** for these resources (Managed Blockchain is opt-in because it bills
hourly). It has not been deployed against a live account as part of this hackathon build.

## Cedar authorization

Cedar is the **only** authority for protected operations. The agent never authorizes anything.

Policies (`lib/aws/cedar/policies.ts`, exported to `infra/cedar/` by `npm run cedar:export`):

| Policy | Effect |
| --- | --- |
| `verifier-minimum-disclosure-proof` | **permit** registered verifier + supported claim + `>=` threshold + permitted purpose + result-only disclosure |
| `forbid-full-history` | **forbid** complete transaction history — always |
| `forbid-identity-disclosure` | **forbid** identity requests — always |
| `forbid-raw-values` | **forbid** exact values — always |
| `forbid-unregistered-verifier` | **forbid** anything from unregistered verifiers |
| `holder-approves-own-request` | **permit** a holder to approve only their own *pending* request |
| `issuer-issues-registered-types` | **permit** issuance only of the issuer's registered credential types |
| `issuer-revokes-own-credentials` / `holder-withdraws-own-credentials` | revocation rights |

Locally these run on the official Cedar engine (`@cedar-policy/cedar-wasm`) with strict schema validation;
in production the same policies are uploaded to Verified Permissions (`scripts/upload-avp.sh`).
Malformed requests fail closed (DENY).

## Strands agent

`services/strands-agent/agent.py` is a Strands Agents SDK agent on Amazon Bedrock with **no tools** — it can
read the question and nothing else. It returns a Pydantic-typed structured request:

```json
{ "kind": "predicate", "claim": "successful_transactions", "operator": ">=", "threshold": 20,
  "purpose": "seller_verification", "subjectRole": "seller" }
```

It reports over-broad requests faithfully (`"kind": "full_history"`) instead of quietly narrowing them, so
Cedar makes — and records — the DENY. Vague questions ("is this seller trustworthy?") produce
**suggested verifiable facts**, never a score.

With `AGENT_MODE=local` (default) the app uses `lib/aws/strands/localInterpreter.ts`, a deterministic
implementation of the same output contract. The UI labels which engine produced each interpretation, and
all agent output is schema-validated with zod before it reaches Cedar.

## Local setup

Requirements: Node.js ≥ 20.9.

```bash
npm install
npm run dev
```

Open http://localhost:3000. The demo dataset (organisations, users, credentials, 11 past verifications with
real proofs, one pending request) is seeded automatically on first request into `.data/`.

Other commands:

```bash
npm run test        # vitest: crypto, chaincode, Cedar, reputation, interpreter, full flows
npm run typecheck
npm run lint
npm run build
npm run cedar:export  # regenerate infra/cedar/* from lib/aws/cedar/policies.ts
```

Reset demo data at any time from the presenter controls (see below) or delete `.data/`.

## Environment variables

Copy `.env.example` to `.env.local`. Everything defaults to local mode.

| Variable | Default | Meaning |
| --- | --- | --- |
| `DEMO_MODE` | `true` | Seeds demo data, enables persona switching and the host-feedback simulator |
| `BLOCKCHAIN_MODE` | `local` | `local` (deterministic ledger) or `fabric` |
| `DATA_MODE` | `local` | `local` JSON store or `dynamodb` |
| `POLICY_MODE` | `local` | `local` Cedar WASM or `avp` (Verified Permissions) |
| `AGENT_MODE` | `local` | `local` interpreter or `strands` (calls `STRANDS_AGENT_URL`) |
| `AUTH_MODE` | `demo` | `demo` personas or `cognito` |
| `EVIDENCE_MODE` | `local` | `local` sealed files or `s3` |
| `SESSION_SECRET`, `WALLET_ENCRYPTION_KEY` | dev value | **Required** when `DEMO_MODE=false` |
| `AWS_REGION`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `DYNAMODB_TABLE`, `S3_BUCKET`, `VERIFIED_PERMISSIONS_POLICY_STORE`, `AVP_POLICY_MAP`, `BEDROCK_MODEL_ID`, `STRANDS_AGENT_URL`, `STRANDS_AGENT_TOKEN` | — | AWS integration |
| `FABRIC_PEER_ENDPOINT`, `FABRIC_PEER_HOST_ALIAS`, `FABRIC_TLS_CERT_PATH`, `FABRIC_MSP_ID`, `FABRIC_CERT_PATH`, `FABRIC_KEY_PATH`, `FABRIC_CHANNEL`, `FABRIC_CHAINCODE` | — | Fabric gateway |

## Demo credentials

No passwords in demo mode. `/login` offers four personas; **`/demo` is a presenter guide** with the whole
cast, who can see what, and a clickable step-by-step script.

Everywhere a person or company is named, the brackets after the name say **what they are**, in plain English —
never a bare role word. "NewHost23 (brand-new host who has never completed a booking, so there is nothing to
verify)", not "NewHost23 (new host)".

| Persona | Kind | What they are | Where they work |
| --- | --- | --- | --- |
| **Vineet** · `TL-7F4A` | Person | a person who holds his own reputation and decides who gets to see it | Trustline app, OneCity |
| **Arjun** | Person | a person who sells a service — he rents out his flat and is checked by buyers | Trustline app, OneCity |
| **Marketplace A** | Organisation | an issuer — a company that signs credentials about what people actually did | `/issuer` |
| **Marketplace B** | Organisation | a verifier — a company that asks for proof and receives only yes or no | `/verifier` |

Every screen in demo mode has a coloured **"Viewing as …"** bar at the top showing which persona you are and
which surface you are on (Trustline app, OneCity website, issuer or verifier console), with **Switch** and
**Guide** buttons. Person sessions and organisation sessions use separate cookies, so the verifier console and
a person's app can be open side by side in two tabs.

### The demo world

`lib/demo/cast.ts` is the single source of truth. Seeding it produces roughly:

| | |
| --- | --- |
| Service categories on OneCity | **19** — stays, hotels, flights, tours, rides, car rental, bikes, dining, groceries, courier, IT projects, tutoring, home services, salon, clinic, pet care, equipment, coworking, event venues |
| Organisations | **27** issuers and verifiers, including one registered for buyer checks only and one not registered at all |
| People and businesses | **59** holders |
| Listings | **42**, at least two per category |
| Credentials on the ledger | **~129**, of which 4 are revoked |
| Past verification requests | **65** |
| OneCity bookings | **39** — 33 completed and reviewed, 3 declined by the provider, 3 still awaiting a decision |

Every outcome the app can produce is present in the seed before you touch anything:

| Outcome | Count | Example |
| --- | --- | --- |
| `VERIFIED` | 31 | Arjun proves 100+ completed bookings |
| `NOT_SATISFIED` | 16 | Tanvi has exactly 20 bookings; "21 or more?" comes back not met |
| `DENIED_BY_POLICY` | 7 | identity, full history, exact value, wrong purpose, unregistered verifier |
| `FAILED` | 4 | credential revoked by the issuer, withdrawn by the holder, or never existed |
| `DECLINED` | 2 | the holder simply said no |
| `PENDING` | 5 | waiting for a person to decide |

Behaviour is covered across the whole range, not just the flattering end: **0%** (Omkar completed none of his
14 projects; Zaid boarded none of his 8 flights), **10%** (Karan showed up for 3 of 31 bookings; Bhaskar
completed 1 of 10 rentals), **50%** (Devansh cancels half his bookings; Gaurav pays half his bills), **75%**,
**90%**, **100% at scale** (Imran, 1,450 rides, never cancelled) and **100% from a sample of one** (Divya),
which the app flags as limited history rather than excellent. Plus: no history at all, a record nearly three
years old, a holder with one revoked and one live credential, and one holder carrying both buyer and seller
reputation.

Key seeded values the script quotes:

- **Vineet:** Marketplace reputation (**47 successful transactions**), Hotel guest reputation (**8 completed
  stays**), Freelance reputation (**12 completed projects**), and a Ride Platform credential that was
  **revoked**. "When you buy / book": 96% / 100% / 94%. His "When you sell / host" card (98% / 96% / Low)
  comes from his own selling and freelancing, and is unrelated to Arjun. He has no seeded OneCity bookings, so
  these numbers come only from the four platforms that vouched for him.
- **Arjun:** hosting record from Hotel Platform: **124** completed of 126 bookings, **2** cancellations (98%).
- **NewHost23:** no credentials at all, shown as "Limited verified history" — never as a warning.
- A pending request from Marketplace B: *20+ successful transactions*.

**Presenter controls:** the **Switch** button in the persona bar, **Ctrl/⌘ + Shift + D**, or `?demo=1`.
Switch persona, open OneCity or the guide, reset data.

## Demo flow (3 minutes)

The same script, with one-click buttons, is at **`/demo`**.

1. **Vineet** → `/dashboard`: *Your reputation. Your control.* Tap a metric to show its formula and inputs.
2. **Vineet** → OneCity → **Modern Apartment**. Host Arjun: ✓ Verified · 124 completed bookings · 98%.
   Open the Trustline shield (extension). Then *Cozy Studio*: NewHost23 shows "Limited verified history", not "scam".
3. **Vineet** → Request to book → the sheet shows Arjun's record and the 96% Arjun will see → **Send request**.
   Nothing is reserved. Switch to **Arjun** → My bookings → the request → he reads Vineet's published Trustline
   and **Accepts**. Try it with **Karan** instead and watch a host decline, with a reason.
4. **Marketplace B** → `/verifier`: *"Does this buyer have at least 20 successful bookings?"* for `TL-7F4A` →
   Understand → **Request private proof** (Cedar: allowed). Keep this tab open.
5. **Vineet** (second tab) → `/requests` → Review → what they will / will not receive → **Approve** → the
   private-proof animation: **47** stays in the wallet, **≥ 20** proven, proof **VALID**.
6. The **Marketplace B** tab flips to **✓ 20+ successful transactions**; "Everything you received" has no 47 and
   no name. (After switching persona, tap the request in its history list to reopen it.)
7. **Marketplace B**: *"Give me the buyer's complete transaction history."* → **REQUEST DENIED** (`forbid-full-history`).
8. **Marketplace A** → `/issuer`: issue a credential, then **Revoke** → *Blockchain status: REVOKED*. `/ledger`
   shows the raw on-chain payloads.
9. **Vineet** → OneCity → My bookings → the booking → *Complete stay* → "How was Arjun?" → Submit.
10. **Arjun** (Switch) → OneCity → **My bookings** → same booking → "How was Vineet?" → Submit. Answers are
    double-blind until both sides submit. OneCity then issues a credential to each and both land on the ledger.
11. **Arjun** → `/credentials`: his new hosting outcome credential.

Close: *Your reputation becomes portable. Your personal data doesn't.*

## Browser extension

`extension/` is a Chrome Manifest V3 prototype. Load it via `chrome://extensions` → Developer mode →
**Load unpacked** → select `extension/`. On OneCity pages it detects `data-trustline-subject` elements,
fetches each subject's **public** summary from `/api/trust/:id`, and shows a shield that expands into a
panel. When installed, it marks the page and the in-app web preview steps aside. See
[extension/README.md](extension/README.md).

The extension does not integrate with Airbnb, Ola, Uber, Swiggy, Zomato, Booking.com or any other real
platform. `lib/platforms/` defines a `PlatformAdapter` interface for future, legitimate partner integrations;
only `demoMarketplaceAdapter.ts` (OneCity, a fictional marketplace) exists.

## Testing

`npm run test` (65 tests):

- ZK range proof soundness/completeness and transcript binding
- Chaincode: issuance, forged signatures, unregistered types, **private-field rejection**, ledger payloads
  contain no values/names/keys, issuer and holder revocation
- Cedar: schema validation, allow, deny (full history, identity, raw values, unregistered verifier, wrong purpose)
- Reputation calculations and revoked-credential exclusion
- Interpreter contract (predicates, faithful over-broad reporting, clarification, schema validity)
- End-to-end service flows for scenarios A–E: verification, NOT_SATISFIED, ratio proofs, decline,
  denial, booking + two-sided feedback + issuance, issuer Cedar denial, revocation → failed verification
- Booking requests: only the provider can answer, only once, nothing completes before they accept, and a
  declined request issues no credential to either side
- The headline percentages the demo script quotes out loud (0%, 10%, 100% on both sides) stay put
- Demo-cast integrity: every category has listings, every label explains itself, every issuer is allowed to
  issue what it issues, nobody books their own listing, and **every seeded verification phrasing still maps to
  a claim the interpreter can act on** — the guard that stops one awkward sentence breaking the seed

Manual responsive checks were done at 375, 390, 414, 768 and 1440 px (no horizontal page overflow).

## Production roadmap

- **Holder-side wallet.** Move holder keys and openings to the device (WebCrypto/secure enclave or a mobile
  wallet) so the server never sees them; proofs are generated client-side.
- **Standards.** Map credentials to W3C Verifiable Credentials 2.0 / SD-JWT VC; evaluate BBS+ signatures or
  Bulletproofs for smaller proofs; unlinkable presentations (rerandomised commitments).
- **Issuer onboarding.** Governance for issuer registration on the Fabric channel (endorsement policies,
  member voting), key rotation via KMS/HSM, per-issuer rate limits and audits.
- **Deployment.** Deploy the Next.js API via OpenNext/Amplify on Lambda behind API Gateway; wire
  Cognito-hosted UI; CloudWatch dashboards and EventBridge events for issuance/revocation.
- **Platform adapters.** Real integrations only through official partner APIs and explicit user consent.
- **Disputes & appeals** for contested outcomes; expiry and re-issuance policies.

## Limitations

Honest about what this MVP is and is not:

- **Custodial wallet.** Holder keys and credential openings are generated and stored server-side (sealed
  with AES-256-GCM). Proof generation therefore runs on the server on the holder's behalf.
- **Proof system** is a from-scratch bit-decomposition range proof, not an audited library. Proofs are ~10 KB
  and linkable across verifiers (same credential id, same commitments).
- **Trustline IDs** are 4-hex-digit fingerprints (collision-checked) for readability; production needs longer
  identifiers or a registry anchored on-chain.
- **Issuer data is issuer-asserted.** Trustline proves *who said it* and that it hasn't been revoked, not
  that the issuer's underlying data is correct.
- **Local ledger** is a single-process deterministic simulation of Fabric semantics, not a distributed
  network. The Fabric adapter and chaincode are written against the Fabric Gateway / contract APIs but were not
  run against a live Amazon Managed Blockchain network during this build. Block browsing is local-only.
- **AWS adapters** (Cognito, DynamoDB, S3, Verified Permissions, Strands/Bedrock) are implemented but were
  not exercised against live AWS resources in this build; local equivalents were.
- **Issuer statistics** (e.g. 1,284 issued) combine seeded historical counters with live ledger counts.
- No payments are taken; OneCity is fictional.

## Security considerations

- Server-side authorization on every route (`lib/auth/guards.ts`); Cedar before every protected operation;
  the frontend is never trusted.
- All request bodies validated with zod; ids and Trustline IDs strictly pattern-checked.
- Application identity (Cognito `sub`, internal user id) is separate from the Trustline identity and is
  never returned by public endpoints.
- No secrets or keys in client code; sessions are HMAC-signed, HTTP-only, SameSite=Lax cookies.
- Holder secrets and evidence sealed with AES-256-GCM with associated data; S3 uses SSE-KMS with public
  access blocked and TLS enforced; DynamoDB uses KMS.
- Chaincode whitelists on-chain fields and verifies issuer/holder signatures itself.
- Errors are logged without request bodies or personal data; the agent Lambda never logs prompts.
- `SESSION_SECRET` / `WALLET_ENCRYPTION_KEY` are required outside demo mode; demo routes 404 when
  `DEMO_MODE=false`.
- Security headers: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`.
