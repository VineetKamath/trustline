import { AlertTriangle, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { Logo } from "@/components/layout/logo";
import { Badge, Card } from "@/components/ui/primitives";
import { getServices } from "@/lib/services/context";
import { publicTrustByTrustlineId } from "@/lib/services/trust";
import { trustlineIdSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/t/[trustlineId]">) {
  const { trustlineId } = await props.params;
  return { title: `Trustline ${trustlineId.toUpperCase()}` };
}

/** Public Trustline profile: published behavioural claims only, no PII. */
export default async function PublicTrustlinePage(props: PageProps<"/t/[trustlineId]">) {
  const { trustlineId } = await props.params;
  const parsed = trustlineIdSchema.safeParse(trustlineId);
  if (!parsed.success) notFound();
  const s = await getServices();
  const trust = await publicTrustByTrustlineId(s, parsed.data);
  if (!trust) notFound();
  const verified = trust.status === "VERIFIED";

  const rows: [string, string][] = [["Verified credentials", String(trust.verifiedCredentials)]];
  if (trust.hosting) {
    rows.push(["Completed bookings (host)", String(trust.hosting.completedBookings)]);
    rows.push(["Host completion", `${trust.hosting.completionRate}%`]);
    rows.push(["Host cancellations", String(trust.hosting.cancellations)]);
  }
  if (trust.buyer) rows.push(["Booking reliability", trust.buyer.bookingReliability === null ? "—" : `${trust.buyer.bookingReliability}%`]);
  if (trust.seller) rows.push(["Seller completion", trust.seller.transactionCompletion === null ? "—" : `${trust.seller.transactionCompletion}%`]);

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-16 max-w-3xl items-center px-4 sm:px-6">
        <Logo />
      </header>
      <main className="mx-auto max-w-md px-4 pb-16 pt-6">
        <Card className="overflow-hidden">
          <div className="border-b border-line p-6 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-faint">Public Trustline profile</p>
            <p className="mt-3 font-mono text-[32px] font-semibold tracking-tight">{trust.trustlineId}</p>
            <div className="mt-3 flex justify-center">
              {verified ? (
                <Badge tone="verified">
                  <ShieldCheck /> Verified behaviour
                </Badge>
              ) : (
                <Badge tone="caution">
                  <AlertTriangle /> Limited verified history
                </Badge>
              )}
            </div>
          </div>
          <dl className="divide-y divide-line px-6">
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-3.5">
                <dt className="text-[14px] text-muted">{k}</dt>
                <dd className="text-[16px] font-semibold tabular">{v}</dd>
              </div>
            ))}
          </dl>
          {trust.issuers.length ? (
            <div className="flex flex-wrap gap-2 px-6 pb-6">
              {trust.issuers.map((i) => (
                <Badge key={i}>{i}</Badge>
              ))}
            </div>
          ) : null}
        </Card>
        <p className="mt-4 text-center text-[12.5px] leading-relaxed text-muted">
          Shows only what this person chose to publish, re-verified against the ledger just now. No name, contact details
          or transaction history.
        </p>
      </main>
    </div>
  );
}
