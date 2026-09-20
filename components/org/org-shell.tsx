import { LogoMark } from "@/components/layout/logo";
import { OrgMark } from "@/components/ui/primitives";
import { DemoSwitcher } from "@/components/navigation/demo-switcher";
import Link from "next/link";
import { PersonaBar } from "@/components/navigation/persona-bar";
import { personaForOrg } from "@/lib/demo/personas";

export function OrgShell({
  org,
  role,
  demoMode,
  children,
}: {
  org: { id: string; name: string; monogram: string; tone: string } | null;
  role: "issuer" | "verifier";
  demoMode: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      {demoMode ? (
        <PersonaBar
          persona={org ? (personaForOrg(org.id) ?? null) : null}
          context={role === "issuer" ? "Issuer console (a company that gives out credentials)" : "Verifier console (a company that asks for proof)"}
        />
      ) : null}
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark size={26} />
            <span className="text-[16px] font-semibold tracking-[-0.03em]">Trustline</span>
            <span className="hidden rounded-full border border-line px-2 py-0.5 text-[11.5px] font-medium text-muted sm:inline">
              {role === "issuer" ? "Issuer console" : "Verifier console"}
            </span>
          </Link>
          {org ? (
            <div className="flex items-center gap-2.5">
              <span className="hidden text-right sm:block">
                <span className="block text-[13.5px] font-medium leading-tight">{org.name}</span>
                <span className="block text-[11.5px] text-muted">Registered {role}</span>
              </span>
              <OrgMark monogram={org.monogram} tone={org.tone} size={34} />
            </div>
          ) : null}
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1200px] px-4 pb-24 pt-6 sm:px-6 lg:px-10 lg:pt-10">{children}</main>
      {demoMode ? <DemoSwitcher /> : null}
    </div>
  );
}
