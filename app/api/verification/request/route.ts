import { requireOrg } from "@/lib/auth/guards";
import { json, parseBody, route } from "@/lib/http";
import { createVerificationRequest, getRequestForVerifier } from "@/lib/services/verification";
import { verificationRequestBodySchema } from "@/lib/validation/schemas";

export const POST = route(async (request: Request) => {
  const { s, org } = await requireOrg("verifier");
  const body = await parseBody(request, verificationRequestBodySchema);
  const created = await createVerificationRequest(s, org.id, body);
  const view = await getRequestForVerifier(s, org.id, created.id);
  return json({ request: view }, { status: created.status === "DENIED_BY_POLICY" ? 200 : 201 });
});
