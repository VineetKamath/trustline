// Complete transaction histories are never disclosed to verifiers.
forbid (
  principal,
  action == Trustline::Action::"RequestFullHistory",
  resource
);
