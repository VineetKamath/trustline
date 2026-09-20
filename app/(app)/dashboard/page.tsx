import { ArrowRight, EyeOff, Fingerprint, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Rise, Stagger } from "@/components/animations";
import { ActivityItem } from "@/components/trust/activity-item";
import { ReputationCard } from "@/components/trust/reputation-card";
import { Card, Eyebrow, OrgMark, SectionTitle } from "@/components/ui/primitives";
import { pageUser } from "@/lib/auth/page";
import { listActivity } from "@/lib/services/activity";
import { holderReputation } from "@/lib/services/trust";
import { holderPrivacyStats, listHolderRequests } from "@/lib/services/verification";

export const metadata = { title: "Home" };

export default async function DashboardPage() {
  const { s, user } = await pageUser();
  const [rep, requests, activity, privacy] = await Promise.all([
    holderReputation(s, user.id),
    listHolderRequests(s, user.id),
    listActivity(s, user.id, 4),
    holderPrivacyStats(s, user.id),
  ]);
  const pending = requests.filter((r) => r.status === "PENDING");
  const active = rep.credentials.filter((c) => c.status === "ACTIVE");
  const buyerSources = rep.buyer.metrics[0].sources;
  const sellerSources = rep.seller.metrics[0].sources;
  const showBuyer = buyerSources.length > 0;
  const showSeller = sellerSources.length > 0;

  return (
    <Stagger className="space-y-8">
      <Rise>
        <div className="flex flex-col gap-1">
          <Eyebrow>Trustline · {user.trustlineId}</Eyebrow>
          <h1 className="mt-1 text-[30px] font-semibold leading-[1.08] tracking-[-0.035em] text-ink sm:text-[38px]">
            Your reputation.
            <br className="sm:hidden" /> <span className="text-muted">Your control.</span>
          </h1>
          <p className="mt-2 text-[15px] text-muted">Welcome back, {user.displayName}.</p>
        </div>
      </Rise>

      {pending.length > 0 ? (
        <Rise>
          <Link
            href="/requests"
            className="group flex items-center gap-4 rounded-[20px] border border-accent-line bg-accent-soft/70 p-4 transition-colors hover:bg-accent-soft sm:p-5"
          >
            <OrgMark monogram={pending[0].verifierMonogram} tone={pending[0].verifierTone} size={44} />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-accent-strong">
                New verification request
              </p>
              <p className="mt-0.5 truncate text-[15px] font-medium text-ink">
                {pending[0].verifierName} wants to verify: {pending[0].label}
              </p>
            </div>
            <span className="hidden items-center gap-1 text-sm font-medium text-accent-strong sm:inline-flex">
              Review <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
            <ArrowRight className="size-5 text-accent-strong sm:hidden" />
          </Link>
        </Rise>
      ) : null}

      <Rise className={showBuyer && showSeller ? "grid gap-4 lg:grid-cols-2 lg:gap-6" : "grid max-w-2xl gap-4"}>
        {showBuyer ? (
          <ReputationCard
            context={rep.buyer}
            heading="When you buy / book"
            subtitle={`From ${buyerSources.join(" + ")}`}
          />
        ) : null}
        {showSeller ? (
          <ReputationCard
            context={rep.seller}
            heading="When you sell / host"
            subtitle={`From ${sellerSources.join(" + ")}`}
          />
        ) : null}
        {!showBuyer && !showSeller ? (
          <p className="rounded-[20px] border border-dashed border-line-strong p-6 text-sm text-muted">
            No verified behaviour yet. Complete a transaction on a Trustline-connected platform to earn credentials.
          </p>
        ) : null}
      </Rise>

      <Rise className="grid gap-4 lg:grid-cols-[1.4fr_1fr] lg:gap-6">
        <Card className="p-5 sm:p-6">
          <SectionTitle
            action={
              <Link href="/activity" className="text-[13px] font-medium text-muted hover:text-ink">
                View all
              </Link>
            }
          >
            Recent activity
          </SectionTitle>
          <div className="divide-y divide-line">
            {activity.map((a) => (
              <ActivityItem key={a.id} item={a} compact />
            ))}
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="p-5 sm:p-6">
            <SectionTitle
              action={
                <Link href="/credentials" className="text-[13px] font-medium text-muted hover:text-ink">
                  Manage
                </Link>
              }
            >
              Verified by
            </SectionTitle>
            <div className="space-y-3">
              {active.map((c) => (
                <div key={c.credentialId} className="flex items-center gap-3">
                  <OrgMark monogram={c.issuerMonogram} tone={c.issuerTone} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-ink">{c.headline.text}</p>
                    <p className="truncate text-[12.5px] text-muted">{c.issuerName}</p>
                  </div>
                  <ShieldCheck className="size-[18px] text-verified" aria-label="Verified on ledger" />
                </div>
              ))}
            </div>
          </Card>

          <Link href="/privacy" className="group">
            <Card className="p-5 transition-shadow group-hover:shadow-lift sm:p-6">
              <SectionTitle>Privacy</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-subtle/70 p-3.5">
                  <Fingerprint className="mb-2 size-5 text-accent" />
                  <p className="tabular text-2xl font-semibold">{privacy.proofsGenerated}</p>
                  <p className="text-[12.5px] text-muted">Private proofs</p>
                </div>
                <div className="rounded-2xl bg-subtle/70 p-3.5">
                  <EyeOff className="mb-2 size-5 text-verified" />
                  <p className="tabular text-2xl font-semibold">{privacy.identityShared}</p>
                  <p className="text-[12.5px] text-muted">Times identity shared</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>
      </Rise>
    </Stagger>
  );
}
