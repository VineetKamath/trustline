import { ArrowRight, Ban, Database, EyeOff, KeyRound, Link2, Lock, ScrollText, UserRound } from "lucide-react";
import Link from "next/link";
import { CountUp, Rise, Stagger } from "@/components/animations";
import { Badge, Card, Eyebrow, Mono, SectionTitle } from "@/components/ui/primitives";
import { pageUser } from "@/lib/auth/page";
import { POLICY_EXPLANATIONS } from "@/lib/aws/cedar/policies";
import { shortTx } from "@/lib/format";
import { listHolderCredentials } from "@/lib/services/credentials";
import { holderPrivacyStats } from "@/lib/services/verification";

export const metadata = { title: "Privacy" };

const PROTECTIONS = ["forbid-full-history", "forbid-identity-disclosure", "forbid-raw-values", "forbid-unregistered-verifier"];

export default async function PrivacyPage() {
  const { s, user } = await pageUser();
  const [stats, credentials, ledger] = await Promise.all([
    holderPrivacyStats(s, user.id),
    listHolderCredentials(s, user.id),
    s.chain.recentTransactions(3),
  ]);
  const active = credentials.filter((c) => c.status === "ACTIVE").length;
  const revoked = credentials.length - active;

  const tiles = [
    { label: "Personal identity shared", value: stats.identityShared, icon: UserRound, note: "times" },
    { label: "Full transaction history shared", value: stats.historyShared, icon: EyeOff, note: "times" },
    { label: "Private proofs generated", value: stats.proofsGenerated, icon: KeyRound, note: "zero-knowledge" },
    { label: "Requests blocked by policy", value: stats.blocked, icon: Ban, note: "by Cedar" },
  ];

  return (
    <Stagger className="space-y-10">
      <Rise>
        <Eyebrow className="mb-2">Privacy center</Eyebrow>
        <h1 className="max-w-2xl text-[28px] font-semibold leading-[1.12] tracking-[-0.03em] sm:text-[36px]">
          Trustline separates your reputation from your identity.
        </h1>
      </Rise>

      <Rise className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
        <Card className="flex flex-col justify-between p-6">
          <div>
            <p className="text-[13px] text-muted">Trustline ID</p>
            <p className="mt-1 font-mono text-[30px] font-semibold tracking-tight">{user.trustlineId}</p>
          </div>
          <div className="mt-6 space-y-2 text-[13.5px]">
            <div className="flex items-center justify-between">
              <span className="text-muted">Credentials</span>
              <span className="font-medium">
                {active} active · {revoked} revoked
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Holder key</span>
              <Mono className="text-ink-2">{shortTx(user.holderPublicKey)}</Mono>
            </div>
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {tiles.map((t) => (
            <Card key={t.label} className="p-4 sm:p-5">
              <t.icon className="size-5 text-muted" />
              <p className="mt-3 text-[30px] font-semibold leading-none tracking-tight">
                <CountUp value={t.value} />
              </p>
              <p className="mt-2 text-[13px] leading-snug text-ink-2">{t.label}</p>
            </Card>
          ))}
        </div>
      </Rise>

      <Rise>
        <SectionTitle>Two identities, deliberately apart</SectionTitle>
        <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
          <Card className="p-5">
            <Badge>Application login</Badge>
            <p className="mt-3 text-[15px] font-semibold">Who you are</p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-muted">
              Your sign-in (Amazon Cognito in production). Used only to open this app. Never shown to platforms and
              never linked to your Trustline ID publicly.
            </p>
          </Card>
          <div className="flex items-center justify-center py-1 text-faint">
            <span className="rounded-full border border-dashed border-line-strong px-3 py-1 text-[12px]">no link</span>
          </div>
          <Card className="p-5">
            <Badge tone="accent">Trustline identity</Badge>
            <p className="mt-3 text-[15px] font-semibold">How you behave</p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-muted">
              A holder key and the pseudonymous ID {user.trustlineId}. Credentials are bound to it with per-credential
              commitments, so issuers can&apos;t link them to each other.
            </p>
          </Card>
        </div>
      </Rise>

      <Rise>
        <SectionTitle>Where your data lives</SectionTitle>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            {
              icon: Link2,
              title: "On the ledger",
              tone: "accent" as const,
              items: ["Credential IDs and types", "Issuer identity and signatures", "Commitments (hashes)", "Revocation status"],
            },
            {
              icon: Lock,
              title: "Off-chain, encrypted",
              tone: "neutral" as const,
              items: ["Your credential values", "Blinding factors (your wallet)", "Feedback evidence (S3, sealed)", "App state (DynamoDB)"],
            },
            {
              icon: Ban,
              title: "Never stored on-chain",
              tone: "danger" as const,
              items: ["Names, phone, email, address", "Transaction history", "Transaction values", "Payment details"],
            },
          ].map((col) => (
            <Card key={col.title} className="p-5">
              <div className="flex items-center gap-2">
                <col.icon className="size-[18px] text-ink-2" />
                <p className="text-[15px] font-semibold">{col.title}</p>
              </div>
              <ul className="mt-3 space-y-2 text-[13.5px] text-ink-2">
                {col.items.map((i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-line-strong" />
                    {i}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </Rise>

      <Rise className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <SectionTitle>
            <span className="inline-flex items-center gap-2">
              <ScrollText className="size-4" /> Active Cedar protections
            </span>
          </SectionTitle>
          <ul className="space-y-3">
            {PROTECTIONS.map((id) => (
              <li key={id} className="rounded-xl bg-subtle/70 px-4 py-3">
                <p className="text-[14px] text-ink">{POLICY_EXPLANATIONS[id]}</p>
                <Mono className="text-faint">{id}</Mono>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5 sm:p-6">
          <SectionTitle
            action={
              <Link href="/ledger" className="inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-ink">
                Ledger explorer <ArrowRight className="size-3.5" />
              </Link>
            }
          >
            <span className="inline-flex items-center gap-2">
              <Database className="size-4" /> Latest on the ledger
            </span>
          </SectionTitle>
          <div className="space-y-3">
            {ledger.map((tx) => (
              <div key={tx.txId} className="rounded-xl border border-line p-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone="neutral">{tx.fn}</Badge>
                  <span className="text-[12px] text-muted">Block #{tx.blockNumber}</span>
                </div>
                <Mono className="mt-2 block truncate text-muted">tx {shortTx(tx.txId, 12, 8)}</Mono>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[12.5px] text-muted">Every entry is public. None contains a name, value or history.</p>
        </Card>
      </Rise>
    </Stagger>
  );
}
