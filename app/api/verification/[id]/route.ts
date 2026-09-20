import { optionalOrg, optionalUser } from "@/lib/auth/guards";
import { json, route } from "@/lib/http";
import { notFound, unauthorized } from "@/lib/services/errors";
import { getRequestForHolder, getRequestForVerifier } from "@/lib/services/verification";
import { idSchema } from "@/lib/validation/schemas";

export const GET = route(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!idSchema.safeParse(id).success) throw notFound("Verification request");
  const as = new URL(request.url).searchParams.get("as");
  if (as === "verifier") {
    const { s, org } = await optionalOrg("verifier");
    if (!org) throw unauthorized();
    return json({ request: await getRequestForVerifier(s, org.id, id) });
  }
  const { s, user } = await optionalUser();
  if (!user) throw unauthorized();
  return json({ request: await getRequestForHolder(s, user.id, id) });
});
