import { Building2, Eye, EyeOff, ShieldCheck, Store, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { ActAsButton } from "@/components/demo/act-as-button";
import { Logo } from "@/components/layout/logo";
import { Badge, Card, Eyebrow, OrgMark } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { config } from "@/lib/config";
import { LISTINGS, ORGS, PEOPLE } from "@/lib/demo/cast";
import type { Persona } from "@/lib/demo/personas";
import { CATEGORY_ORDER } from "@/lib/platforms/categories";
import { getServices } from "@/lib/services/context";
import { holderReputation } from "@/lib/services/trust";

export const metadata = { title: "Demo guide" };
export const dynamic = "force-dynamic";

type Who = Persona | { userId: string } | undefined;

function Metric({ label, value, tone }: { label: string; value: string; tone: "good" | "mid" | "bad" | "none" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium",
        tone === "good" && "bg-verified-soft text-verified",
        tone === "mid" && "bg-caution-soft text-caution",
        tone === "bad" && "bg-danger-soft text-danger",
        tone === "none" && "bg-subtle text-muted",
      )}
    >
      {label}: <span className="font-semibold">{value}</span>
    </span>
  );
}

const toneFor = (v: number | null) => (v === null ? "none" : v >= 90 ? "good" : v >= 70 ? "mid" : "bad");

const SCENARIOS: { title: string; who: string; what: string; act: Who; href: string; cta: string }[] = [
  {
    title: "The main story: a private “yes” without the data",
    who: "Marketplace B (a company that asks for proof) → Vineet (the main demo holder)",
    what: "Marketplace B asks “20+ successful bookings?”. Vineet approves. The proof keeps 47 hidden and verifies ≥ 20.",
    act: "verifier",
    href: "/verifier",
    cta: "Open as Marketplace B",
  },
  {
    title: "Over-reach is blocked by policy",
    who: "Marketplace B (a company that asks for proof)",
    what: "Ask “Give me the buyer's complete transaction history.” Cedar denies it before it ever reaches the person.",
    act: "verifier",
    href: "/verifier",
    cta: "Try it",
  },
  {
    title: "A verifier that isn't registered gets nothing",
    who: "DataScrape Partners (a data broker that never registered with Trustline)",
    what: "Its perfectly ordinary “10+ transactions?” question about Rahul was refused by Cedar on the grounds of who was asking, not what was asked.",
    act: { userId: "usr_rahul" },
    href: "/activity",
    cta: "See it on Rahul's activity",
  },
  {
    title: "Registered, but not for this kind of question",
    who: "LendFast (registered only to check buyers)",
    what: "It asked a seller question about Maya. Same policy engine, different reason: the purpose is outside what LendFast registered for.",
    act: { userId: "usr_maya" },
    href: "/activity",
    cta: "See it on Maya's activity",
  },
  {
    title: "0% — never completed anything",
    who: "Omkar (freelancer who has not finished any of his 14 projects)",
    what: "Every completion proof about him fails honestly. Trustline states the outcome without editorialising.",
    act: undefined,
    href: "/marketplace/lst_data_pipeline",
    cta: "Open his listing",
  },
  {
    title: "0% on the customer side",
    who: "Zaid (traveller who booked 8 flights and boarded none)",
    what: "His reliability reads 0%. SkyFare's “≥ 50%?” check came back NOT MET — without ever revealing the number.",
    act: { userId: "usr_zaid" },
    href: "/dashboard",
    cta: "Sign in as Zaid",
  },
  {
    title: "10% reliability — the frequent no-show",
    who: "Karan (guest who books and then does not turn up)",
    what: "His dashboard shows 10% booking reliability in red. A hotel's “≥ 80%?” check came back NOT MET. He still has a pending “2+ bookings” request he can pass.",
    act: { userId: "usr_karan" },
    href: "/dashboard",
    cta: "Sign in as Karan",
  },
  {
    title: "10% on the provider side, twice over",
    who: "Bhaskar (bike owner, 1 of 10 rentals) and DashDrop (courier, 1 of 10 parcels)",
    what: "The same failure pattern in two unrelated categories — evidence that this is a behaviour, not a one-off.",
    act: undefined,
    href: "/marketplace?category=courier",
    cta: "Open courier",
  },
  {
    title: "Exactly half",
    who: "Devansh (host who cancels half his bookings), Rakesh (plumber who turns up half the time)",
    what: "The 50% midpoint: too good to call fraud, far too bad to rely on. The proof lets each verifier draw its own line.",
    act: undefined,
    href: "/marketplace/lst_plumbing_visit",
    cta: "Open Rakesh's listing",
  },
  {
    title: "100% at scale",
    who: "Imran (1,450 rides, never cancelled), Neha (520 orders, all paid)",
    what: "A perfect record that actually means something, because the sample is large. Compare it with Manoj's perfect 3 rides.",
    act: undefined,
    href: "/marketplace/lst_night_airport",
    cta: "Open Imran's listing",
  },
  {
    title: "The threshold is exact, not fuzzy",
    who: "Tanvi (guest with exactly 20 completed bookings)",
    what: "“20 or more?” verifies. “21 or more?” comes back NOT MET. Both proofs are about the same hidden number, and neither reveals it.",
    act: { userId: "usr_tanvi" },
    href: "/activity",
    cta: "Sign in as Tanvi",
  },
  {
    title: "Shows up, but cancels a lot",
    who: "Ananya (guest who turns up but cancels 37% of bookings)",
    what: "~95% reliability when she does book, but her cancellation behaviour is low. Two separate numbers, not one score.",
    act: { userId: "usr_ananya" },
    href: "/dashboard",
    cta: "Sign in as Ananya",
  },
  {
    title: "Turns up every time, pays late every other time",
    who: "Gaurav (customer who settled 12 of 24 bills as agreed)",
    what: "Booking reliability VERIFIED at ≥ 95%, payment reliability NOT MET at ≥ 90%. One person, two honest answers.",
    act: { userId: "usr_gaurav" },
    href: "/dashboard",
    cta: "Sign in as Gaurav",
  },
  {
    title: "Doesn't pay on time",
    who: "Nikhil (IT client who paid 5 of 10 invoices as agreed)",
    what: "Payment reliability ~50%. DevHire's “≥ 90% payment reliability” check: NOT MET. Its request for his full payment history: DENIED.",
    act: { userId: "usr_nikhil" },
    href: "/requests",
    cta: "Sign in as Nikhil",
  },
  {
    title: "High disputes vs. a clean record",
    who: "Rohan (complaints on 27% of orders) vs Farhan (1,340 of 1,382 delivered)",
    what: "Compare the two grocery listings: Rohan's Trustline says “Disputes: High”; Farhan's says Low.",
    act: undefined,
    href: "/marketplace?category=groceries",
    cta: "Open groceries",
  },
  {
    title: "Car owner who cancels vs. one who doesn't",
    who: "Vikram (cancels 3 in 10 rentals) vs Priya (58 of 60 completed)",
    what: "~70% completion vs 97%. DriveNow verified Priya ≥ 95%; Vikram's ≥ 90% came back NOT MET.",
    act: undefined,
    href: "/marketplace?category=car_rental",
    cta: "Open car rental",
  },
  {
    title: "Too little history to judge",
    who: "Manoj (3 rides), Divya (1 order), Ishita (2 bookings), Arnav (4 sessions)",
    what: "100% from 3 rides is flagged “limited history” — a tiny sample can't pass for a great record.",
    act: undefined,
    href: "/marketplace/lst_mysuru",
    cta: "Open Manoj's listing",
  },
  {
    title: "A platform takes a credential back",
    who: "QuickStays99 (host whose record CityStay revoked)",
    what: "CityStay revoked his record after a policy review. His listing shows “Credential revoked”, and OneCity's verification FAILED at the ledger check.",
    act: undefined,
    href: "/marketplace/lst_budget_room",
    cta: "Open his listing",
  },
  {
    title: "A person takes their own credential back",
    who: "Naveen (gear owner who withdrew his own record)",
    what: "The other half of revocation: the holder, not the issuer, signed the revocation. Nothing can be proven from it afterwards.",
    act: { userId: "usr_naveen" },
    href: "/credentials",
    cta: "Sign in as Naveen",
  },
  {
    title: "One dead credential, one live one",
    who: "Harsh (tutoring record revoked, salon record still valid)",
    what: "His wallet skips the revoked credential and proves the claim from the live one. The verifier never learns there were two.",
    act: { userId: "usr_harsh" },
    href: "/credentials",
    cta: "Sign in as Harsh",
  },
  {
    title: "Brand new, nothing verified",
    who: "NewHost23 (never completed a booking), Dev (never held a credential)",
    what: "“Limited verified history” — never “scam”. No evidence either way, and the app says exactly that.",
    act: undefined,
    href: "/marketplace/lst_cozy_studio",
    cta: "Open NewHost23's listing",
  },
  {
    title: "Good numbers, but old ones",
    who: "Pooja (diner whose only record is nearly three years old)",
    what: "The proof still verifies — the credential is valid. What it cannot tell you is anything about the last three years.",
    act: { userId: "usr_pooja" },
    href: "/credentials",
    cta: "Sign in as Pooja",
  },
  {
    title: "One person, both sides of the market",
    who: "Maya (sells handmade goods and buys groceries)",
    what: "Buyer metrics and seller metrics on the same Trustline, proven separately. Being a good seller says nothing about being a good buyer.",
    act: { userId: "usr_maya" },
    href: "/dashboard",
    cta: "Sign in as Maya",
  },
  {
    title: "Average is fine too",
    who: "Aisha (9 no-shows in 40 rentals), Suresh (900 rides at 90%)",
    what: "Aisha is at ~75%: DriveNow's “≥ 90%” failed, but she has a pending “≥ 70%” request she can pass. Approve it and watch the proof.",
    act: { userId: "usr_aisha" },
    href: "/requests",
    cta: "Sign in as Aisha",
  },
  {
    title: "Businesses have Trustlines too",
    who: "Lakeview Residency (hotel), SkyBird Airways (airline), Sunrise Clinic, The Desk Company",
    what: "Companies hold credentials on exactly the same terms as people — including an airline with 19,200 seats behind its number.",
    act: undefined,
    href: "/marketplace?category=flights",
    cta: "Open flights",
  },
  {
    title: "A sensitive category, still behaviour-only",
    who: "Sunrise Clinic (clinic that held 6,400 of 6,500 slots)",
    what: "Clinic appointments record attendance and payment, never a diagnosis. The credential schema simply has nowhere to put health data.",
    act: undefined,
    href: "/marketplace/lst_clinic_slot",
    cta: "Open the clinic",
  },
  {
    title: "A person says no",
    who: "Tarun (freelancer who abandoned 7 of 20 projects)",
    what: "He declined DevHire's completion-rate request. Nothing was shared; DevHire only sees “declined”.",
    act: { userId: "usr_tarun" },
    href: "/requests",
    cta: "Sign in as Tarun",
  },
  {
    title: "Vouching: issue and revoke",
    who: "Marketplace A (a company that signs credentials)",
    what: "Issue a credential to any Trustline ID, then revoke it. The ledger flips to REVOKED and future proofs fail.",
    act: "issuer",
    href: "/issuer",
    cta: "Open as Marketplace A",
  },
  {
    title: "The provider decides, on verified behaviour",
    who: "Karan (guest who books and then does not turn up) → Arjun (host who rents out his flat)",
    what: "Karan's request was never a booking. Arjun read his published Trustline, saw nothing he could rely on, and declined with a reason. Nothing was charged and no credential was issued — a request that never became a transaction leaves no mark on either of them.",
    act: { userId: "usr_karan" },
    href: "/marketplace/trips",
    cta: "See it as Karan",
  },
  {
    title: "A request still waiting to be answered",
    who: "Dev (never held a credential) → NewHost23 (never completed a booking)",
    what: "Two people with nothing verified between them. Sign in as NewHost23, open the request, and decide — the panel shows exactly what Dev published and nothing more.",
    act: { userId: "usr_newhost23" },
    href: "/marketplace/trips",
    cta: "Decide as NewHost23",
  },
  {
    title: "Book something and get accepted",
    who: "Any customer → any provider",
    what: "Request to book on OneCity, switch to the provider, read the customer's Trustline, accept. Only then can the booking be completed and only then do credentials get issued.",
    act: "user",
    href: "/marketplace",
    cta: "Request as Vineet",
  },
  {
    title: "Two-sided feedback builds reputation",
    who: "Any customer → any provider, in any of the categories",
    what: "Once the provider has accepted, mark it completed, answer for your side, then switch to the provider and answer theirs. Both get a new credential.",
    act: "user",
    href: "/marketplace",
    cta: "Book as Vineet",
  },
];

export default async function DemoGuidePage() {
  const s = await getServices();
  const people = await Promise.all(
    PEOPLE.map(async (p) => {
      const user = await s.store.get("users", p.id);
      const rep = user ? await holderReputation(s, p.id) : null;
      const listing = LISTINGS.find((l) => l.providerUserId === p.id);
      const revoked = rep ? rep.credentials.filter((c) => c.status !== "ACTIVE").length : 0;
      return { p, user, rep, listing, revoked };
    }),
  );
  const providers = people.filter((x) => x.listing);
  const customers = people.filter((x) => !x.listing);

  const personCard = ({ p, user, rep, listing, revoked }: (typeof people)[number]) => {
    const buyer = rep?.buyer;
    const seller = rep?.seller;
    return (
      <Card key={p.id} className="flex flex-col p-4">
        <div className="flex items-start gap-3">
          <OrgMark monogram={p.name[0]} tone={p.tone} size={40} className="rounded-full" />
          <div className="min-w-0">
            <p className="text-[15px] font-semibold leading-tight">
              {p.name} <span className="font-normal text-muted">({p.label})</span>
            </p>
            <p className="mt-0.5 font-mono text-[11.5px] text-faint">{user?.trustlineId}</p>
          </div>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-ink-2">{p.scenario}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {buyer && buyer.sampleSize > 0 ? (
            <Metric label="Reliability" value={buyer.metrics[0].display} tone={toneFor(buyer.metrics[0].value)} />
          ) : null}
          {buyer && buyer.sampleSize > 0 ? (
            <Metric label="Payments" value={buyer.metrics[1].display} tone={toneFor(buyer.metrics[1].value)} />
          ) : null}
          {buyer && buyer.sampleSize > 0 ? (
            <Metric label="Not cancelled" value={buyer.metrics[2].display} tone={toneFor(buyer.metrics[2].value)} />
          ) : null}
          {seller && seller.sampleSize > 0 ? (
            <Metric label="Completion" value={seller.metrics[0].display} tone={toneFor(seller.metrics[0].value)} />
          ) : null}
          {seller && seller.sampleSize > 0 ? (
            <Metric
              label="Disputes"
              value={seller.metrics[2].display}
              tone={seller.metrics[2].level === "Low" ? "good" : seller.metrics[2].level === "Moderate" ? "mid" : "bad"}
            />
          ) : null}
          {buyer?.limitedHistory || seller?.limitedHistory ? <Metric label="History" value="limited" tone="mid" /> : null}
          {revoked ? <Metric label="Revoked" value={String(revoked)} tone="bad" /> : null}
          {rep && rep.credentials.length === 0 ? <Metric label="Credentials" value="none" tone="none" /> : null}
        </div>
        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          <ActAsButton persona={{ userId: p.id }} href="/dashboard" label="Sign in" variant="primary" />
          {listing ? <ActAsButton href={`/marketplace/${listing.id}`} label="Listing" /> : null}
          <Link
            href={`/t/${user?.trustlineId}`}
            className="inline-flex h-9 items-center rounded-full border border-line bg-surface px-3.5 text-[13px] font-medium hover:border-line-strong"
          >
            Public profile
          </Link>
        </div>
      </Card>
    );
  };

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <Link href="/login" className="text-[14px] font-medium text-muted hover:text-ink">
          Sign in
        </Link>
      </header>

      <main className="mx-auto max-w-6xl space-y-16 px-4 pb-24 pt-6 sm:px-6">
        <section>
          <Eyebrow className="mb-3">Demo guide</Eyebrow>
          <h1 className="text-[32px] font-semibold leading-[1.08] tracking-[-0.035em] sm:text-[44px]">A city&apos;s worth of reputation.</h1>
          <p className="mt-4 max-w-3xl text-[16px] leading-relaxed text-ink-2">
            Trustline is a reputation network. <strong>Platforms vouch</strong> for how people behave — hosts, guests,
            drivers, renters, stores, freelancers, clients — by issuing credentials. <strong>People carry</strong> that
            reputation everywhere. <strong>Anyone can check it</strong> without seeing private data: they ask a yes/no
            question and get a cryptographic proof.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {(
              [
                [Building2, `${ORGS.length} organisations`, "Issuers vouch, verifiers ask"],
                [Users, `${PEOPLE.length} people & businesses`, "From 10% to 100%, new to revoked"],
                [Store, `${LISTINGS.length} listings on OneCity`, `Across ${CATEGORY_ORDER.length} kinds of service`],
              ] as const
            ).map(([Icon, a, b]) => (
              <Card key={a} className="flex items-center gap-3 p-4">
                <Icon className="size-5 text-ink-2" />
                <div>
                  <p className="text-[15px] font-semibold">{a}</p>
                  <p className="text-[13px] text-muted">{b}</p>
                </div>
              </Card>
            ))}
          </div>
          {!config.demoMode ? <p className="mt-4 text-sm text-danger">Demo mode is off, so persona switching is disabled.</p> : null}
        </section>

        <section>
          <h2 className="text-[22px] font-semibold tracking-tight">Try every case</h2>
          <p className="mb-5 mt-1 text-[14px] text-muted">
            Each button switches you to the right person or company and opens the right page. The coloured bar at the top
            of every screen always says who you are.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {SCENARIOS.map((sc, i) => (
              <Card key={sc.title} className="flex flex-col p-5">
                <div className="flex items-start gap-3">
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-ink font-mono text-[12px] font-semibold text-white">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[15.5px] font-semibold leading-snug">{sc.title}</p>
                    <p className="mt-0.5 text-[12.5px] font-medium text-accent-strong">{sc.who}</p>
                  </div>
                </div>
                <p className="mt-3 flex-1 text-[13.5px] leading-relaxed text-muted">{sc.what}</p>
                <div className="mt-4">
                  <ActAsButton persona={sc.act} href={sc.href} label={sc.cta} />
                </div>
              </Card>
            ))}
            <Card className="flex flex-col p-5">
              <div className="flex items-center gap-3">
                <UserPlus className="size-5 text-ink-2" />
                <p className="text-[15.5px] font-semibold">Start from zero</p>
              </div>
              <p className="mt-3 flex-1 text-[13.5px] leading-relaxed text-muted">
                Create a brand-new Trustline on the sign-in page. It starts with no credentials — reputation is earned,
                never declared.
              </p>
              <div className="mt-4">
                <ActAsButton href="/login" label="Create an account" />
              </div>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="flex flex-wrap items-baseline gap-x-2 text-[22px] font-semibold tracking-tight">
            <Store className="size-5 self-center" /> Providers
            <span className="text-[15px] font-normal text-muted">
              the people and businesses who sell something — hosts, hotels, airlines, guides, drivers, owners, stores,
              couriers, freelancers, tutors, tradespeople, salons, clinics, sitters, spaces and venues
            </span>
          </h2>
          <p className="mb-5 mt-1 text-[14px] text-muted">Numbers are computed live from each one&apos;s active credentials.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{providers.map(personCard)}</div>
        </section>

        <section>
          <h2 className="flex flex-wrap items-baseline gap-x-2 text-[22px] font-semibold tracking-tight">
            <Users className="size-5 self-center" /> Customers
            <span className="text-[15px] font-normal text-muted">
              the people who buy something — guests, travellers, renters, riders, shoppers, diners, clients, students,
              patients, members and organisers
            </span>
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{customers.map(personCard)}</div>
        </section>

        <section>
          <h2 className="flex items-center gap-2 text-[22px] font-semibold tracking-tight">
            <Building2 className="size-5" /> Organisations
          </h2>
          <p className="mb-5 mt-1 text-[14px] text-muted">
            <strong>Issuers</strong> vouch for behaviour on their platform. <strong>Verifiers</strong> ask for proof. Some do
            both. Marketplace A and Marketplace B have consoles in this demo.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ORGS.map((o) => (
              <Card key={o.id} className="flex items-center gap-3 p-3.5">
                <OrgMark monogram={o.monogram} tone={o.tone} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold leading-snug">{o.name}</p>
                  {/* The bracket says what this organisation does in Trustline, not just its sector. */}
                  <p className="mt-0.5 text-[12.5px] leading-snug text-muted">({o.label})</p>
                  <div className="mt-1 flex gap-1.5">
                    {o.roles.map((r) => (
                      <Badge key={r} tone={r === "issuer" ? "verified" : "accent"}>
                        {r}
                      </Badge>
                    ))}
                  </div>
                </div>
                {o.id === "org_marketplace_a" ? <ActAsButton persona="issuer" href="/issuer" label="Console" /> : null}
                {o.id === "org_marketplace_b" ? <ActAsButton persona="verifier" href="/verifier" label="Console" /> : null}
              </Card>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-[22px] font-semibold tracking-tight">Who can see what</h2>
          <div className="space-y-2">
            {(
              [
                ["The person", "Their own values (e.g. 47, 96%, 10%), who asked, what they shared", "Anyone else's values"],
                ["A verifier", "“Yes/no” to the exact question it asked, plus a proof", "The number, the name, the history, other platforms"],
                ["A marketplace (OneCity)", "Its own bookings, providers' published claims", "Private credential values"],
                ["The ledger (everyone)", "Credential IDs, commitments (hashes), issuer signatures, revoked or not", "Any name, value or transaction"],
              ] as const
            ).map(([who, sees, never]) => (
              <Card key={who} className="grid gap-2 p-4 sm:grid-cols-[200px_1fr_1fr] sm:items-start sm:gap-6">
                <p className="flex items-center gap-2 text-[15px] font-semibold">
                  <ShieldCheck className="size-4 text-muted" /> {who}
                </p>
                <p className="flex gap-2 text-[13.5px] text-ink-2">
                  <Eye className="mt-0.5 size-4 shrink-0 text-verified" /> {sees}
                </p>
                <p className="flex gap-2 text-[13.5px] text-muted">
                  <EyeOff className="mt-0.5 size-4 shrink-0 text-danger" /> {never}
                </p>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
