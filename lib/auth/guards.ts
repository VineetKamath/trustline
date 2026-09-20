import "server-only";
import { getServices, type Services } from "@/lib/services/context";
import { forbidden, unauthorized } from "@/lib/services/errors";
import type { OrgRole, OrganizationRecord, UserRecord } from "@/types";
import { readOrgSession, readUserSession } from "./session";

/** Server-side authorization: never trust anything the browser claims. */
export async function requireUser(): Promise<{ s: Services; user: UserRecord }> {
  const s = await getServices();
  const userId = await readUserSession();
  if (!userId) throw unauthorized();
  const user = await s.store.get("users", userId);
  if (!user || !user.loginEnabled) throw unauthorized();
  return { s, user };
}

export async function optionalUser(): Promise<{ s: Services; user: UserRecord | null }> {
  const s = await getServices();
  const userId = await readUserSession();
  const user = userId ? await s.store.get("users", userId) : null;
  return { s, user: user && user.loginEnabled ? user : null };
}

export async function requireOrg(role: OrgRole): Promise<{ s: Services; org: OrganizationRecord }> {
  const s = await getServices();
  const session = await readOrgSession();
  if (!session) throw unauthorized();
  const org = await s.store.get("organizations", session.orgId);
  if (!org || session.role !== role || !org.roles.includes(role)) throw forbidden("This console is not available to you");
  return { s, org };
}

export async function optionalOrg(role: OrgRole) {
  const s = await getServices();
  const session = await readOrgSession();
  if (!session || session.role !== role) return { s, org: null };
  const org = await s.store.get("organizations", session.orgId);
  return { s, org: org && org.roles.includes(role) ? org : null };
}
