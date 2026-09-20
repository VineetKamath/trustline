import { requireOrg } from "@/lib/auth/guards";
import { json, parseBody, route } from "@/lib/http";
import { interpretRequest } from "@/lib/services/verification";
import { interpretBodySchema } from "@/lib/validation/schemas";

/** Strands agent: natural language → structured request. It never authorizes. */
export const POST = route(async (request: Request) => {
  const { s, org } = await requireOrg("verifier");
  const body = await parseBody(request, interpretBodySchema);
  const interpretation = await interpretRequest(s, org.id, body.text);
  return json({ interpretation });
});
