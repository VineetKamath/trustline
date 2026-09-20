import { requireUser } from "@/lib/auth/guards";
import { json, route } from "@/lib/http";
import { notFound } from "@/lib/services/errors";
import { completeBooking } from "@/lib/services/marketplace";
import { idSchema } from "@/lib/validation/schemas";

export const POST = route(async (_request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!idSchema.safeParse(id).success) throw notFound("Booking");
  const { s, user } = await requireUser();
  return json({ booking: await completeBooking(s, user.id, id) });
});
