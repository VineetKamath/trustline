import { requireUser } from "@/lib/auth/guards";
import { json, route } from "@/lib/http";
import { listHolderCredentials } from "@/lib/services/credentials";
import { notFound } from "@/lib/services/errors";
import { idSchema } from "@/lib/validation/schemas";

export const GET = route(async (_request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) throw notFound("Credential");
  const { s, user } = await requireUser();
  const credential = (await listHolderCredentials(s, user.id)).find((c) => c.credentialId === parsed.data);
  if (!credential) throw notFound("Credential");
  const ledger = await s.chain.getCredential(parsed.data);
  return json({ credential, ledger });
});
