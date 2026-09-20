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
};
