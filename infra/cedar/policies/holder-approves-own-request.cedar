// Only the subject of a pending request can approve it.
permit (
  principal is Trustline::Holder,
  action == Trustline::Action::"ApproveVerification",
  resource is Trustline::VerificationRequest
)
when { resource.subject == principal && resource.status == "PENDING" };
