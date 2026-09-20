import { getServices } from "@/lib/services/context";
import { json, route } from "@/lib/http";

/** Public ledger view: exactly what is written on-chain (commitments only). */
export const GET = route(async (request: Request) => {
  const s = await getServices();
  const limit = Math.min(50, Math.max(1, Number(new URL(request.url).searchParams.get("limit") ?? 20) || 20));
  return json({
    network: s.chain.networkName,
    mode: s.chain.mode,
    height: await s.chain.height(),
    transactions: await s.chain.recentTransactions(limit),
  });
});
