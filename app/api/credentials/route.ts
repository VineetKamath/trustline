import { requireUser } from "@/lib/auth/guards";
import { json, route } from "@/lib/http";
import { listHolderCredentials } from "@/lib/services/credentials";

export const GET = route(async () => {
  const { s, user } = await requireUser();
  return json({ credentials: await listHolderCredentials(s, user.id) });
});
