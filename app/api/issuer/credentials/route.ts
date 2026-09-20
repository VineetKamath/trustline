import { requireOrg } from "@/lib/auth/guards";
import { json, route } from "@/lib/http";
import { issuerStats, listIssuedCredentials } from "@/lib/services/credentials";

export const GET = route(async () => {
  const { s, org } = await requireOrg("issuer");
  return json({ stats: await issuerStats(s, org), credentials: await listIssuedCredentials(s, org.id) });
});
