import { requireUser } from "@/lib/auth/guards";
import { json, parseBody, route } from "@/lib/http";
import { declineRequest } from "@/lib/services/verification";
import { requestIdBodySchema } from "@/lib/validation/schemas";

export const POST = route(async (request: Request) => {
  const { s, user } = await requireUser();
  const body = await parseBody(request, requestIdBodySchema);
  const updated = await declineRequest(s, user.id, body.requestId);
  return json({ status: updated.status });
});
