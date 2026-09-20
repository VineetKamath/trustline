import { requireUser } from "@/lib/auth/guards";
import { json, parseBody, route } from "@/lib/http";
import { createBooking, listGuestBookings } from "@/lib/services/marketplace";
import { bookingBodySchema } from "@/lib/validation/schemas";

export const GET = route(async () => {
  const { s, user } = await requireUser();
  return json({ bookings: await listGuestBookings(s, user.id) });
});

export const POST = route(async (request: Request) => {
  const { s, user } = await requireUser();
  const body = await parseBody(request, bookingBodySchema);
  return json({ booking: await createBooking(s, user.id, body) }, { status: 201 });
});
