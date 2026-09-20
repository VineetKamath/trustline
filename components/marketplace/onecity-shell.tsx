import { CalendarDays, Search } from "lucide-react";
import Link from "next/link";
import { DemoSwitcher } from "@/components/navigation/demo-switcher";
import { PersonaBar } from "@/components/navigation/persona-bar";
import type { ViewingAs } from "@/lib/demo/personas";
import { CATEGORIES, CATEGORY_ORDER } from "@/lib/platforms/categories";

export const ONECITY_ACCENT = "#c2553a";

export function OneCityLogo() {
  return (
    <Link href="/marketplace" className="flex items-center gap-2" aria-label="OneCity home">
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
        <rect width="28" height="28" rx="8" fill={ONECITY_ACCENT} />
        <circle cx="14" cy="14" r="6.5" fill="none" stroke="#fff" strokeWidth="2.2" />
        <circle cx="14" cy="14" r="2" fill="#fff" />
      </svg>
      <span className="text-[18px] font-bold tracking-[-0.04em] text-[#2b1d17]">onecity</span>
    </Link>
  );
}

/**
 * OneCity is an internal demo marketplace built for this prototype. It covers
 * every category in `lib/platforms/categories.ts` — stays, hotels, flights,
 * tours, rides, car and bike rental, dining, groceries, courier, IT projects,
 * tutoring, home services, salons, clinics, pet care, equipment, coworking and
 * event venues. It is not a real company and has no affiliation with any
 * booking platform.
 */
export function OneCityShell({
  children,
  demoMode,
  persona,
}: {
  children: React.ReactNode;
  demoMode: boolean;
  persona: ViewingAs | null;
}) {
  return (
    <div className="min-h-dvh bg-white text-[#221a16]">
      {demoMode ? <PersonaBar persona={persona} context="OneCity website (a marketplace that uses Trustline)" /> : null}
      <div className="bg-[#2b1d17] px-4 py-1.5 text-center text-[11.5px] text-white/75">
        OneCity is a demo marketplace for the Trustline prototype — not a real service.{" "}
        <Link href="/dashboard" className="font-medium text-white underline-offset-2 hover:underline">
          Open Trustline
        </Link>
      </div>
      <header className="sticky top-0 z-30 border-b border-[#efe9e4] bg-white/90 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
          <OneCityLogo />
          <div className="hidden h-11 flex-1 items-center gap-3 rounded-full border border-[#ece6e1] px-4 text-[14px] text-[#7a6d66] shadow-[0_1px_6px_rgb(0_0_0/0.06)] md:flex md:max-w-md">
            <Search className="size-4" /> Stays, flights, cars, tutors, clinics, venues…
          </div>
          <Link
            href="/marketplace/trips"
            className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-[14px] font-medium text-[#3b2c25] hover:bg-[#f6f1ed]"
          >
            <CalendarDays className="size-4" /> My bookings
          </Link>
        </div>
        <nav aria-label="Categories" className="no-scrollbar mx-auto flex max-w-[1200px] gap-1 overflow-x-auto px-4 pb-2 sm:px-6 lg:px-10">
          <Link href="/marketplace" className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium text-[#3b2c25] hover:bg-[#f6f1ed]">
            All
          </Link>
          {CATEGORY_ORDER.map((c) => (
            <Link
              key={c}
              href={`/marketplace?category=${c}`}
              className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium text-[#3b2c25] hover:bg-[#f6f1ed]"
            >
              {CATEGORIES[c].label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-[1200px] px-4 pb-28 pt-6 sm:px-6 lg:px-10">{children}</main>
      {demoMode ? <DemoSwitcher /> : null}
    </div>
  );
}
