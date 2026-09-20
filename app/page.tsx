import {
  ArrowRight,
  Ban,
  Check,
  EyeOff,
  FileBadge2,
  Fingerprint,
  Link2,
  ScanSearch,
  ScrollText,
  ShieldCheck,
  Store,
  X,
} from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/animations";
import { HeroFlow } from "@/components/landing/hero-flow";
import { Logo, LogoMark } from "@/components/layout/logo";
import { Eyebrow } from "@/components/ui/primitives";

function Section({ id, children, className = "" }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`mx-auto w-full max-w-[1200px] scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28 lg:px-10 ${className}`}>
      {children}
    </section>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="max-w-3xl text-[32px] font-semibold leading-[1.08] tracking-[-0.035em] sm:text-[46px]">{children}</h2>;
}

export default function LandingPage() {
  return (
    <div className="overflow-x-clip">
      <header className="sticky top-0 z-40 border-b border-transparent bg-canvas/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-6 lg:px-10">
          <Logo />
          <nav className="hidden items-center gap-8 whitespace-nowrap text-[14px] text-muted lg:flex">
            <a href="#how" className="hover:text-ink">
              How it works
            </a>
            <a href="#privacy" className="hover:text-ink">
              Privacy
            </a>
            <a href="#ledger" className="hover:text-ink">
              Verification network
            </a>
            <Link href="/demo" className="hover:text-ink">
              Demo guide
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden h-10 items-center whitespace-nowrap rounded-full px-4 text-[14px] font-medium text-ink-2 hover:bg-subtle sm:inline-flex">
              Sign in
            </Link>
            <Link href="/login" className="inline-flex h-10 items-center whitespace-nowrap rounded-full bg-ink px-4 text-[14px] font-medium text-white hover:bg-ink-2">
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid w-full max-w-[1200px] items-center gap-12 px-4 pb-20 pt-12 sm:px-6 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:px-10 lg:pb-28">
        <Reveal>
          <Eyebrow className="mb-5">Cross-platform trust layer</Eyebrow>
          <h1 className="text-[46px] font-semibold leading-[0.98] tracking-[-0.045em] sm:text-[68px] lg:text-[76px]">
            Your reputation.
            <br />
            <span className="text-muted">Not your data.</span>
          </h1>
          <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-ink-2 sm:text-[19px]">
            Trustline lets people and businesses verify transaction behaviour without exposing private history.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex h-[52px] items-center justify-center gap-2 rounded-full bg-ink px-7 text-[16px] font-medium text-white shadow-[0_1px_2px_rgb(0_0_0/0.12)] transition-colors hover:bg-ink-2"
            >
              Create your Trustline <ArrowRight className="size-[18px]" />
            </Link>
            <a
              href="#how"
              className="inline-flex h-[52px] items-center justify-center rounded-full border border-line bg-surface px-7 text-[16px] font-medium text-ink shadow-card transition-colors hover:border-line-strong"
            >
              See how it works
            </a>
          </div>
          <div className="mt-4">
            <Link href="/demo" className="text-[14px] font-medium text-accent-strong hover:underline">
              Presenting? Open the demo guide — who&apos;s who, step by step →
            </Link>
          </div>
        </Reveal>
        <Reveal delay={0.15}>
          <HeroFlow />
        </Reveal>
      </section>

      {/* Problem */}
      <div className="border-y border-line bg-surface">
        <Section>
          <Reveal>
            <Eyebrow className="mb-4">The problem</Eyebrow>
            <H2>Trust is fragmented across the internet.</H2>
            <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-muted">
              Years of reliable behaviour on one platform count for nothing on the next. Each platform sees only its
              slice — so good actors start from zero and bad actors start fresh.
            </p>
          </Reveal>
          <div className="mt-14 grid gap-4 md:grid-cols-2">
            {[
              {
                title: "When you're the seller",
                items: [
                  "Customers book a table and never arrive",
                  "Guests no-show on confirmed stays",
                  "Nobody is at the delivery address",
                  "Repeated last-minute cancellations",
                ],
              },
              {
                title: "When you're the buyer",
                items: [
                  "Fake hotel and property listings",
                  "Sellers who cancel after you pay",
                  "Services that are never delivered",
                  "Brand-new accounts with no history",
                ],
              },
            ].map((col, i) => (
              <Reveal key={col.title} delay={i * 0.08}>
                <div className="h-full rounded-[24px] border border-line bg-canvas/60 p-6 sm:p-8">
                  <p className="text-[18px] font-semibold tracking-tight">{col.title}</p>
                  <ul className="mt-5 space-y-3">
                    {col.items.map((it) => (
                      <li key={it} className="flex gap-3 text-[15.5px] text-ink-2">
                        <X className="mt-1 size-4 shrink-0 text-faint" /> {it}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>
      </div>

      {/* How it works */}
      <Section id="how">
        <Reveal>
          <Eyebrow className="mb-4">How Trustline works</Eyebrow>
          <H2>Don&apos;t share the history. Prove the behaviour.</H2>
        </Reveal>
        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {[
            {
              icon: FileBadge2,
              step: "01",
              title: "Platforms issue credentials",
              body: "After a completed transaction, the platform issues a signed credential. Its values are sealed in cryptographic commitments and anchored on a shared ledger.",
            },
            {
              icon: Fingerprint,
              step: "02",
              title: "You hold your reputation",
              body: "Credentials from every platform live in your Trustline. You see exactly how each behavioural metric is calculated — no black-box score.",
            },
            {
              icon: ScanSearch,
              step: "03",
              title: "Verifiers get proofs, not data",
              body: "A new platform asks a question. Cedar policy checks it. With your approval, a zero-knowledge proof answers yes or no — nothing more.",
            },
          ].map((s, i) => (
            <Reveal key={s.step} delay={i * 0.08}>
              <div className="h-full rounded-[24px] border border-line bg-surface p-7 shadow-card">
                <div className="flex items-center justify-between">
                  <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-subtle">
                    <s.icon className="size-5 text-ink-2" />
                  </span>
                  <span className="font-mono text-[13px] text-faint">{s.step}</span>
                </div>
                <p className="mt-8 text-[19px] font-semibold tracking-tight">{s.title}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Buyer + seller */}
      <div className="border-y border-line bg-surface">
        <Section>
          <Reveal>
            <Eyebrow className="mb-4">Both sides of every transaction</Eyebrow>
            <H2>Buyers verify sellers. Sellers verify buyers.</H2>
            <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-muted">
              Trust is contextual. Reliable as a guest, new as a host — Trustline keeps behavioural categories separate
              instead of collapsing a person into one number.
            </p>
          </Reveal>
          <div className="mt-14 grid gap-4 md:grid-cols-2">
            <Reveal>
              <div className="rounded-[24px] border border-line bg-canvas/60 p-6 sm:p-8">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-faint">A guest checks a host</p>
                <div className="mt-5 rounded-2xl border border-line bg-surface p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Host · Arjun</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-verified-soft px-2.5 py-1 text-[12px] font-medium text-verified">
                      <ShieldCheck className="size-3.5" /> Verified
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    {[
                      ["124", "completed bookings"],
                      ["98%", "completion"],
                      ["2", "cancellations"],
                    ].map(([v, l]) => (
                      <div key={l} className="rounded-xl bg-subtle/70 py-3">
                        <p className="text-[20px] font-semibold tabular">{v}</p>
                        <p className="text-[11px] text-muted">{l}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="rounded-[24px] border border-line bg-canvas/60 p-6 sm:p-8">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-faint">A seller checks a buyer</p>
                <div className="mt-5 rounded-2xl border border-line bg-surface p-5">
                  <p className="text-[14px] text-muted">“Has this buyer completed at least 20 bookings?”</p>
                  <p className="mt-4 flex items-center gap-2 text-[22px] font-semibold tracking-tight">
                    <span className="inline-flex size-7 items-center justify-center rounded-full bg-verified text-white">
                      <Check className="size-4" strokeWidth={3} />
                    </span>
                    20+ bookings · Verified
                  </p>
                  <p className="mt-3 text-[13.5px] text-muted">Identity hidden. History hidden. Exact count hidden.</p>
                </div>
              </div>
            </Reveal>
          </div>
        </Section>
      </div>

      {/* Privacy */}
      <Section id="privacy">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <Eyebrow className="mb-4">Privacy by construction</Eyebrow>
            <H2>Prove behaviour without exposing your history.</H2>
            <p className="mt-5 text-[17px] leading-relaxed text-muted">
              Values are committed with Pedersen commitments. When someone asks “at least 20?”, your wallet produces a
              zero-knowledge range proof. The verifier checks it against the ledger and learns one bit: yes.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="rounded-[28px] border border-line bg-surface p-6 shadow-lift sm:p-8">
              {[
                ["Private", "successful_transactions = 47", "text-ink-2", EyeOff],
                ["Request", "successful_transactions ≥ 20", "text-accent-strong", ScanSearch],
                ["Verifier receives", "TRUE", "text-verified", Check],
                ["Verifier does not receive", "47", "text-faint line-through", Ban],
              ].map(([label, value, color, Icon], i) => {
                const I = Icon as typeof Check;
                return (
                  <div key={label as string} className={`flex items-center justify-between gap-4 py-4 ${i ? "border-t border-line" : ""}`}>
                    <span className="inline-flex items-center gap-2.5 text-[14px] text-muted">
                      <I className="size-4" /> {label as string}
                    </span>
                    <span className={`font-mono text-[14px] font-semibold ${color as string}`}>{value as string}</span>
                  </div>
                );
              })}
            </div>
          </Reveal>
        </div>
      </Section>

      {/* Ledger */}
      <div id="ledger" className="scroll-mt-20 border-y border-line bg-surface">
        <Section>
          <Reveal>
            <Eyebrow className="mb-4">Verification network</Eyebrow>
            <H2>Your reputation belongs to you.</H2>
            <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-muted">
              Independent platforms need to trust each other&apos;s credentials without trusting a central database. A
              permissioned Hyperledger Fabric ledger records who issued what, whether it&apos;s still valid, and when —
              and nothing personal.
            </p>
          </Reveal>
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {[
              { icon: Link2, title: "On-chain", items: ["Issuer registry & keys", "Credential commitments", "Revocation status", "Timestamps"] },
              { icon: ScrollText, title: "Authorized by Cedar", items: ["Minimum-disclosure claims only", "Registered verifiers only", "Valid purpose required", "Full history: always denied"] },
              { icon: Ban, title: "Never on-chain", items: ["Names, phones, emails", "Addresses & IDs", "Transaction history", "Transaction values"] },
            ].map((c, i) => (
              <Reveal key={c.title} delay={i * 0.08}>
                <div className="h-full rounded-[24px] border border-line bg-canvas/60 p-7">
                  <c.icon className="size-5 text-ink-2" />
                  <p className="mt-6 text-[18px] font-semibold tracking-tight">{c.title}</p>
                  <ul className="mt-4 space-y-2.5">
                    {c.items.map((it) => (
                      <li key={it} className="flex gap-2.5 text-[14.5px] text-ink-2">
                        <span className="mt-[9px] size-1 shrink-0 rounded-full bg-ink-2" /> {it}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>
      </div>

      {/* CTA */}
      <Section className="text-center">
        <Reveal>
          <LogoMark size={44} className="mx-auto" />
          <p className="mx-auto mt-8 max-w-3xl text-[38px] font-semibold leading-[1.05] tracking-[-0.04em] sm:text-[60px]">
            Don&apos;t trust the profile.
            <br />
            <span className="text-muted">Verify the behaviour.</span>
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex h-[52px] items-center justify-center gap-2 rounded-full bg-ink px-7 text-[16px] font-medium text-white hover:bg-ink-2"
            >
              Create your Trustline <ArrowRight className="size-[18px]" />
            </Link>
            <Link
              href="/marketplace"
              className="inline-flex h-[52px] items-center justify-center gap-2 rounded-full border border-line bg-surface px-7 text-[16px] font-medium hover:border-line-strong"
            >
              <Store className="size-[18px]" /> Try the demo marketplace
            </Link>
          </div>
        </Reveal>
      </Section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 py-8 text-[13px] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
          <span>Trustline · hackathon prototype</span>
          <span>Cedar · Hyperledger Fabric · Amazon Bedrock · Strands Agents · AWS</span>
        </div>
      </footer>
    </div>
  );
}
