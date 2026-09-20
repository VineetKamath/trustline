import { requireUser } from "@/lib/auth/guards";
import { json, route } from "@/lib/http";
import { holderReputation } from "@/lib/services/trust";
import { publicWallet } from "@/lib/services/wallet";

/** The signed-in holder's own wallet summary (holder-only). */
export const GET = route(async () => {
  const { s, user } = await requireUser();
  const rep = await holderReputation(s, user.id);
  return json({
    wallet: publicWallet(user),
    displayName: user.displayName,
    reputation: {
      bookingReliability: rep.buyer.metrics[0].value,
      sellerCompletion: rep.seller.metrics[0].value,
      activeCredentials: rep.credentials.filter((c) => c.status === "ACTIVE").length,
    },
  });
});
