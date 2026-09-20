import { requireUser } from "@/lib/auth/guards";
import { json, parseBody, route } from "@/lib/http";
import { notFound } from "@/lib/services/errors";
import { respondToBooking } from "@/lib/services/marketplace";
import { bookingResponseBodySchema, idSchema } from "@/lib/validation/schemas";

/** The provider accepts or declines a booking request. Nobody else can. */
export const POST = route(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!idSchema.safeParse(id).success) throw notFound("Booking");
  const { s, user } = await requireUser();
  const body = await parseBody(request, bookingResponseBodySchema);
  return json({ booking: await respondToBooking(s, user.id, id, body) });
});
