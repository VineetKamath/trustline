permit (
  principal is Trustline::Issuer,
  action == Trustline::Action::"RevokeCredential",
  resource is Trustline::Credential
)
when { resource.issuer == principal };
