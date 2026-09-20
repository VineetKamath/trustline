import "server-only";
import { redirect } from "next/navigation";
import { getServices } from "@/lib/services/context";
import type { OrgRole } from "@/types";
import { readOrgSession, readUserSession } from "./session";

/** For server components: resolve the signed-in holder or redirect to /login. */
export async function pageUser() {
  const s = await getServices();
  const userId = await readUserSession();
  const user = userId ? await s.store.get("users", userId) : null;
  if (!user || !user.loginEnabled) redirect("/login");
  return { s, user };
}

export async function pageOrg(role: OrgRole) {
  const s = await getServices();
  const session = await readOrgSession();
  const org = session && session.role === role ? await s.store.get("organizations", session.orgId) : null;
  return { s, org: org && org.roles.includes(role) ? org : null };
}
