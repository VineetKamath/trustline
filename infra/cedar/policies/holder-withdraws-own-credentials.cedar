permit (
  principal is Trustline::Holder,
  action == Trustline::Action::"RevokeCredential",
  resource is Trustline::Credential
)
when { resource.holder == principal };
