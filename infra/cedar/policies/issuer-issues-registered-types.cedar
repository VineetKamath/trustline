permit (
  principal is Trustline::Issuer,
  action == Trustline::Action::"IssueCredential",
  resource is Trustline::CredentialType
)
when {
  principal.registered &&
  principal.allowedCredentialTypes.contains(resource)
};
