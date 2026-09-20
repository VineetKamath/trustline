import { OneCityShell } from "@/components/marketplace/onecity-shell";
import { readUserSession } from "@/lib/auth/session";
import { config } from "@/lib/config";
import { personaForUser } from "@/lib/demo/personas";
import { getServices } from "@/lib/services/context";

export const metadata = { title: { default: "OneCity", template: "%s · OneCity" } };
export const dynamic = "force-dynamic";

export default async function MarketplaceLayout({ children }: LayoutProps<"/marketplace">) {
  const userId = await readUserSession();
  let persona = null;
  if (userId) {
    const s = await getServices();
    const user = await s.store.get("users", userId);
    persona = personaForUser(userId) ?? (user ? { name: user.displayName, role: "new account", tone: "slate" as const } : null);
  }
  return (
    <OneCityShell demoMode={config.demoMode} persona={persona}>
      {children}
    </OneCityShell>
  );
}
