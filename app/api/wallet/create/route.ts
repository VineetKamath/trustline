import { getServices } from "@/lib/services/context";
import { json, parseBody, route } from "@/lib/http";
import { setUserSession } from "@/lib/auth/session";
import { createUserWallet, publicWallet } from "@/lib/services/wallet";
import { walletCreateBodySchema } from "@/lib/validation/schemas";

/**
 * Creates a new Trustline holder wallet (keys are generated server-side and
 * sealed) and signs in as it. Any previous person session is replaced.
 */
export const POST = route(async (request: Request) => {
  const body = await parseBody(request, walletCreateBodySchema);
  const s = await getServices();
  const user = await createUserWallet(s, {
    displayName: body.displayName,
    publishedClaims: ["booking_reliability", "seller_completion", "verified_credentials"],
  });
  await setUserSession(user.id);
  return json({ wallet: publicWallet(user) }, { status: 201 });
});
