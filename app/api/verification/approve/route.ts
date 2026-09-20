import { requireUser } from "@/lib/auth/guards";
import { json, parseBody, route } from "@/lib/http";
import { approveRequest } from "@/lib/services/verification";
import { requestIdBodySchema } from "@/lib/validation/schemas";

/** Holder consent. Cedar confirms the holder is the subject of a pending request. */
export const POST = route(async (request: Request) => {
  const { s, user } = await requireUser();
  const body = await parseBody(request, requestIdBodySchema);
  const { request: updated, policy } = await approveRequest(s, user.id, body.requestId);
  return json({ status: updated.status, policy });
});
