import { requireOrg, requireUser } from "@/lib/auth/guards";
import { json, route } from "@/lib/http";
import { listHolderRequests, listVerifierRequests } from "@/lib/services/verification";

export const GET = route(async (request: Request) => {
  const as = new URL(request.url).searchParams.get("as");
  if (as === "verifier") {
    const { s, org } = await requireOrg("verifier");
    return json({ requests: await listVerifierRequests(s, org.id) });
  }
  const { s, user } = await requireUser();
  return json({ requests: await listHolderRequests(s, user.id) });
});
