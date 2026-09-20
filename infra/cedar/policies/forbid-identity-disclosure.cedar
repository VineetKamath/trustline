// Names, contact details and government identity are never disclosed.
forbid (
  principal,
  action == Trustline::Action::"RequestIdentity",
  resource
);
