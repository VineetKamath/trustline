import { requireUser } from "@/lib/auth/guards";
import { json, parseBody, route } from "@/lib/http";
import { notFound } from "@/lib/services/errors";
import { submitFeedback } from "@/lib/services/marketplace";
import { feedbackBodySchema, idSchema } from "@/lib/validation/schemas";

export const POST = route(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!idSchema.safeParse(id).success) throw notFound("Booking");
  const { s, user } = await requireUser();
  const body = await parseBody(request, feedbackBodySchema);
  return json(await submitFeedback(s, user.id, id, body));
});
