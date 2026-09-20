import type { RevocationReason } from "@/contracts/trustline-chaincode/src/types";
import { getServices } from "@/lib/services/context";
import { readOrgSession, readUserSession } from "@/lib/auth/session";
import { json, parseBody, route } from "@/lib/http";
import { getCredentialMetadata, revokeCredential } from "@/lib/services/credentials";
import { unauthorized } from "@/lib/services/errors";
import { revokeBodySchema } from "@/lib/validation/schemas";

/**
 * Revocation by the issuing organisation (issuer console session) or by the
 * holder (user session). Cedar decides; the ledger enforces signatures.
 */
export const POST = route(async (request: Request) => {
  const body = await parseBody(request, revokeBodySchema);
  const s = await getServices();
  const meta = await getCredentialMetadata(s, body.credentialId);
  const org = await readOrgSession();
  const userId = await readUserSession();
  let actor: Parameters<typeof revokeCredential>[1];
  if (org?.role === "issuer" && org.orgId === meta.issuerId) actor = { kind: "issuer", orgId: org.orgId };
  else if (userId) actor = { kind: "holder", userId };
  else if (org?.role === "issuer") actor = { kind: "issuer", orgId: org.orgId };
  else throw unauthorized();

  const result = await revokeCredential(s, actor, body.credentialId, body.reason as RevocationReason | undefined);
  if (result.policy.decision !== "ALLOW") return json({ ok: false, policy: result.policy }, { status: 403 });
  return json({ ok: true, policy: result.policy, receipt: result.receipt, status: result.metadata?.status });
});
