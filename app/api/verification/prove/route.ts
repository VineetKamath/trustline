import { requireUser } from "@/lib/auth/guards";
import { json, parseBody, route } from "@/lib/http";
import { proveRequest } from "@/lib/services/verification";
import { requestIdBodySchema } from "@/lib/validation/schemas";

/**
 * Generates the zero-knowledge presentation from the holder's wallet and runs
 * verifier-side verification against the ledger. The response goes to the
 * holder only, so it may include the private value for display.
 */
export const POST = route(async (request: Request) => {
  const { s, user } = await requireUser();
  const body = await parseBody(request, requestIdBodySchema);
  const { result, trace } = await proveRequest(s, user.id, body.requestId);
  const { presentation, ...rest } = result;
  return json({ result: rest, trace, presentationBytes: presentation ? JSON.stringify(presentation).length : 0 });
});
