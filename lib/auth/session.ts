import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { config } from "@/lib/config";
import type { OrgRole } from "@/types";

/**
 * Application sessions. Two independent cookies:
 *   tl_user — a signed-in person (Cognito in production, persona in demo)
 *   tl_org  — an organisation console (issuer / verifier)
 * Both carry only internal ids, are HMAC-signed and HTTP-only. The Trustline
 * ID is never derived from, nor stored in, these cookies.
 */

export const USER_COOKIE = "tl_user";
export const ORG_COOKIE = "tl_org";
const MAX_AGE = 60 * 60 * 12;

interface Payload {
  sub: string;
  role?: OrgRole;
  exp: number;
}

function sign(data: string) {
  return createHmac("sha256", config.sessionSecret).update(data).digest("base64url");
}

export function encodeSession(payload: Omit<Payload, "exp">): string {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + MAX_AGE * 1000 })).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function decodeSession(token: string | undefined): Payload | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = Buffer.from(sign(body));
  const actual = Buffer.from(mac);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Payload;
    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE,
};

export async function readUserSession(): Promise<string | null> {
  const jar = await cookies();
  return decodeSession(jar.get(USER_COOKIE)?.value)?.sub ?? null;
}

export async function readOrgSession(): Promise<{ orgId: string; role: OrgRole } | null> {
  const jar = await cookies();
  const p = decodeSession(jar.get(ORG_COOKIE)?.value);
  return p?.role ? { orgId: p.sub, role: p.role } : null;
}

export async function setUserSession(userId: string) {
  (await cookies()).set(USER_COOKIE, encodeSession({ sub: userId }), cookieOptions);
}

export async function setOrgSession(orgId: string, role: OrgRole) {
  (await cookies()).set(ORG_COOKIE, encodeSession({ sub: orgId, role }), cookieOptions);
}

export async function clearSessions() {
  const jar = await cookies();
  jar.delete(USER_COOKIE);
  jar.delete(ORG_COOKIE);
}
