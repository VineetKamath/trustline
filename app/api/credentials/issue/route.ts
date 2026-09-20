import { requireOrg } from "@/lib/auth/guards";
import { json, parseBody, route } from "@/lib/http";
import { issueByIssuer } from "@/lib/services/credentials";
import { issueBodySchema } from "@/lib/validation/schemas";

export const POST = route(async (request: Request) => {
  const { s, org } = await requireOrg("issuer");
  const body = await parseBody(request, issueBodySchema);
  const result = await issueByIssuer(s, org.id, body);
  if (!result.ok) return json({ ok: false, policy: result.policy }, { status: 403 });
  return json({
    ok: true,
    policy: result.policy,
    steps: result.steps,
    receipt: result.receipt,
    credential: {
      credentialId: result.metadata.credentialId,
      credentialType: result.metadata.credentialType,
      claimCommitment: result.metadata.claimCommitment,
      status: result.metadata.status,
      issuedAt: result.metadata.issuedAt,
    },
  });
});
