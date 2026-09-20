import { clearSessions } from "@/lib/auth/session";
import { json, route } from "@/lib/http";

export const POST = route(async () => {
  await clearSessions();
  return json({ ok: true });
});
