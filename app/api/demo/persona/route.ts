import { config } from "@/lib/config";
import { DEMO_IDS, PERSONAS } from "@/lib/demo/personas";
import { json, parseBody, route } from "@/lib/http";
import { setOrgSession, setUserSession } from "@/lib/auth/session";
import { getServices } from "@/lib/services/context";
import { notFound } from "@/lib/services/errors";
import { personaBodySchema } from "@/lib/validation/schemas";

/** Hackathon persona switch. Disabled entirely when DEMO_MODE=false. */
export const POST = route(async (request: Request) => {
  if (!config.demoMode) throw notFound("Route");
  const body = await parseBody(request, personaBodySchema);
  const s = await getServices();
  if ("userId" in body) {
    const user = await s.store.get("users", body.userId);
    if (!user || !user.loginEnabled) throw notFound("Person");
    await setUserSession(user.id);
    return json({ ok: true, home: "/dashboard" });
  }
  const { persona } = body;
  if (persona === "user") await setUserSession(DEMO_IDS.user);
  if (persona === "host") await setUserSession(DEMO_IDS.host);
  if (persona === "issuer") await setOrgSession(DEMO_IDS.issuer, "issuer");
  if (persona === "verifier") await setOrgSession(DEMO_IDS.verifier, "verifier");
  return json({ ok: true, home: PERSONAS.find((p) => p.key === persona)!.home });
});
