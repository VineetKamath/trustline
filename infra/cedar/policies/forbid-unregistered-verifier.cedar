forbid (
  principal is Trustline::Verifier,
  action,
  resource
)
unless { principal.registered };
