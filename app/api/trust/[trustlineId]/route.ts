import { getServices } from "@/lib/services/context";
import { json, route } from "@/lib/http";
import { notFound } from "@/lib/services/errors";
import { publicTrustByTrustlineId } from "@/lib/services/trust";
import { trustlineIdSchema } from "@/lib/validation/schemas";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "cache-control": "no-store",
};

/**
 * Public trust summary — only claims the holder chose to publish, re-verified
 * against the ledger. Readable cross-origin so the browser extension can use it.
 */
export const GET = route(async (_request: Request, ctx: { params: Promise<{ trustlineId: string }> }) => {
  const { trustlineId } = await ctx.params;
  const parsed = trustlineIdSchema.safeParse(trustlineId);
  if (!parsed.success) throw notFound("Trustline");
  const s = await getServices();
  const summary = await publicTrustByTrustlineId(s, parsed.data);
  if (!summary) throw notFound("Trustline");
  return json({ trust: summary }, { headers: CORS });
});

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
