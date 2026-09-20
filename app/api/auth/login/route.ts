import { z } from "zod";
import { signInWithCognito } from "@/lib/aws/cognito/auth";
import { setUserSession } from "@/lib/auth/session";
import { config } from "@/lib/config";
import { json, parseBody, route } from "@/lib/http";
import { getServices } from "@/lib/services/context";
import { ServiceError, notFound } from "@/lib/services/errors";
import { createUserWallet } from "@/lib/services/wallet";

const body = z.object({ email: z.string().email().max(200), password: z.string().min(8).max(200) });

/**
 * Cognito sign-in (AUTH_MODE=cognito). The Cognito `sub` is mapped to an
 * internal user; a fresh Trustline wallet is created on first login.
 */
export const POST = route(async (request: Request) => {
  if (config.authMode !== "cognito") throw notFound("Route");
  const { email, password } = await parseBody(request, body);
  let identity;
  try {
    identity = await signInWithCognito(email, password);
  } catch {
    throw new ServiceError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
  }
  const s = await getServices();
  const [existing] = await s.store.query("users", "cognitoSub", identity.sub);
  const user = existing ?? (await createUserWallet(s, { displayName: identity.givenName, cognitoSub: identity.sub }));
  await setUserSession(user.id);
  return json({ ok: true });
});
