import { requireUser } from "@/lib/auth/guards";
import { json, parseBody, route } from "@/lib/http";
import { publishClaimsSchema } from "@/lib/validation/schemas";

/** The holder decides which behavioural claims appear on their public profile. */
export const POST = route(async (request: Request) => {
  const { s, user } = await requireUser();
  const body = await parseBody(request, publishClaimsSchema);
  const keep = user.publishedClaims.filter((c) => c === "hosting_summary");
  const updated = { ...user, publishedClaims: [...new Set([...keep, ...body.publishedClaims])] };
  await s.store.put("users", updated);
  return json({ publishedClaims: updated.publishedClaims });
});
