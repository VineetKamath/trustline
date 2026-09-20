import { config } from "@/lib/config";
import { json, route } from "@/lib/http";
import { resetDemo } from "@/lib/services/context";
import { notFound } from "@/lib/services/errors";

export const POST = route(async () => {
  if (!config.demoMode) throw notFound("Route");
  await resetDemo();
  return json({ ok: true });
});
