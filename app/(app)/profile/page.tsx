import { Globe2, Lock, ShieldCheck } from "lucide-react";
import { PublishControls } from "@/components/trust/publish-controls";
import { Badge, Card, PageHeader, SectionTitle } from "@/components/ui/primitives";
import { pageUser } from "@/lib/auth/page";
import { publicTrustSummary } from "@/lib/services/trust";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const { s, user } = await pageUser();
  const pub = await publicTrustSummary(s, user);

  const rows: [string, string][] = [["Trustline ID", pub.trustlineId]];
  if (user.publishedClaims.includes("verified_credentials")) rows.push(["Verified credentials", String(pub.verifiedCredentials)]);
  if (pub.buyer) rows.push(["Booking reliability", pub.buyer.bookingReliability === null ? "—" : `${pub.buyer.bookingReliability}%`]);
  if (pub.seller) rows.push(["Seller completion", pub.seller.transactionCompletion === null ? "—" : `${pub.seller.transactionCompletion}%`]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Trust profile"
        title="What others can see"
        description="Your public profile shows only the behavioural categories you choose — each re-verified against the ledger when viewed. No name, no history."
      />
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <span className="inline-flex items-center gap-2 text-[13px] font-medium text-ink-2">
              <Globe2 className="size-4" /> Public Trustline profile
            </span>
            <Badge tone={pub.status === "VERIFIED" ? "verified" : "caution"}>
              <ShieldCheck /> {pub.status === "VERIFIED" ? "Verified" : "Limited verified history"}
            </Badge>
          </div>
          <div className="p-5 sm:p-6">
            <dl className="divide-y divide-line">
              {rows.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-3.5">
                  <dt className="text-[14px] text-muted">{k}</dt>
                  <dd className={k === "Trustline ID" ? "font-mono text-[15px] font-semibold" : "text-[17px] font-semibold tabular"}>
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
            {user.publishedClaims.includes("verified_credentials") && pub.issuers.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {pub.issuers.map((i) => (
                  <Badge key={i}>{i}</Badge>
                ))}
              </div>
            ) : null}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5 sm:p-6">
            <SectionTitle>Publish on your profile</SectionTitle>
            <PublishControls published={user.publishedClaims} />
          </Card>
          <Card className="p-5 sm:p-6">
            <SectionTitle>
              <span className="inline-flex items-center gap-2">
                <Lock className="size-4" /> Always private
              </span>
            </SectionTitle>
            <p className="text-[14px] leading-relaxed text-muted">
              Your name, contact details, exact counts, individual transactions and the platforms you used for them.
              Verifiers who need more can request a specific threshold proof — and you approve each one.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
