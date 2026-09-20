/**
 * Trustline authorization policies (Cedar).
 *
 * These exact policies are evaluated by the Cedar engine locally
 * (POLICY_MODE=local, via @cedar-policy/cedar-wasm) and are uploaded to the
 * Amazon Verified Permissions policy store in production (POLICY_MODE=avp).
 * See infra/cedar/ for the deployable copies.
 */

export const CEDAR_SCHEMA = `
namespace Trustline {
  entity Verifier = {
    registered: Bool,
    allowedPurposes: Set<String>,
  };
  entity Issuer = {
    registered: Bool,
    allowedCredentialTypes: Set<CredentialType>,
  };
  entity Holder = {
    trustlineId: String,
  };
  entity Claim = {
    supported: Bool,
    unit: String,
  };
  entity CredentialType;
  entity Credential = {
    issuer: Issuer,
    holder: Holder,
  };
  entity VerificationRequest = {
    subject: Holder,
    verifier: Verifier,
    status: String,
  };

  action RequestPredicateProof appliesTo {
    principal: Verifier,
    resource: Claim,
    context: {
      operator: String,
      threshold: Long,
      purpose: String,
      disclosure: String,
    },
  };
  action RequestFullHistory, RequestIdentity, RequestRawValue appliesTo {
    principal: Verifier,
    resource: Claim,
    context: {
      purpose: String,
      disclosure: String,
    },
  };
  action ApproveVerification appliesTo {
    principal: Holder,
    resource: VerificationRequest,
  };
  action IssueCredential appliesTo {
    principal: Issuer,
    resource: CredentialType,
  };
  action RevokeCredential appliesTo {
    principal: [Issuer, Holder],
    resource: Credential,
  };
}
`;

export const CEDAR_POLICIES: Record<string, string> = {
  "verifier-minimum-disclosure-proof": `
// A registered verifier may ask for a yes/no answer to a supported threshold
// claim, for a purpose it is registered for. Nothing else is disclosed.
permit (
  principal is Trustline::Verifier,
  action == Trustline::Action::"RequestPredicateProof",
  resource is Trustline::Claim
)
when {
  principal.registered &&
  resource.supported &&
  context.operator == ">=" &&
  context.threshold >= 1 &&
  context.disclosure == "predicate_result_only" &&
  principal.allowedPurposes.contains(context.purpose)
};`,

  "forbid-full-history": `
// Complete transaction histories are never disclosed to verifiers.
forbid (
  principal,
  action == Trustline::Action::"RequestFullHistory",
  resource
);`,

  "forbid-identity-disclosure": `
// Names, contact details and government identity are never disclosed.
forbid (
  principal,
  action == Trustline::Action::"RequestIdentity",
  resource
);`,

  "forbid-raw-values": `
// Exact private values (e.g. "47") are never disclosed; only predicates.
forbid (
  principal,
  action == Trustline::Action::"RequestRawValue",
  resource
);`,

  "forbid-unregistered-verifier": `
forbid (
  principal is Trustline::Verifier,
  action,
  resource
)
unless { principal.registered };`,

  "holder-approves-own-request": `
// Only the subject of a pending request can approve it.
permit (
  principal is Trustline::Holder,
  action == Trustline::Action::"ApproveVerification",
  resource is Trustline::VerificationRequest
)
when { resource.subject == principal && resource.status == "PENDING" };`,

  "issuer-issues-registered-types": `
permit (
  principal is Trustline::Issuer,
  action == Trustline::Action::"IssueCredential",
  resource is Trustline::CredentialType
)
when {
  principal.registered &&
  principal.allowedCredentialTypes.contains(resource)
};`,

  "issuer-revokes-own-credentials": `
permit (
  principal is Trustline::Issuer,
  action == Trustline::Action::"RevokeCredential",
  resource is Trustline::Credential
)
when { resource.issuer == principal };`,

  "holder-withdraws-own-credentials": `
permit (
  principal is Trustline::Holder,
  action == Trustline::Action::"RevokeCredential",
  resource is Trustline::Credential
)
when { resource.holder == principal };`,
};

/** Human-readable explanation for each policy, shown in the UI. */
export const POLICY_EXPLANATIONS: Record<string, string> = {
  "verifier-minimum-disclosure-proof":
    "Registered verifier, supported claim, valid purpose, minimum disclosure.",
  "forbid-full-history": "The verifier requested information beyond the supported claim.",
  "forbid-identity-disclosure": "Trustline never discloses a person's identity to verifiers.",
  "forbid-raw-values": "Exact private values are never disclosed — only whether a claim holds.",
  "forbid-unregistered-verifier": "The verifier is not registered on the Trustline network.",
  "holder-approves-own-request": "Only the person being verified can approve this request.",
  "issuer-issues-registered-types": "The issuer is registered for this credential type.",
  "issuer-revokes-own-credentials": "Issuers can revoke credentials they issued.",
  "holder-withdraws-own-credentials": "Holders can withdraw their own credentials.",
};
