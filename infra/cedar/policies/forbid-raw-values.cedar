// Exact private values (e.g. "47") are never disclosed; only predicates.
forbid (
  principal,
  action == Trustline::Action::"RequestRawValue",
  resource
);
