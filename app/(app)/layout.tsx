import { AppShell } from "@/components/navigation/app-shell";
import { pageUser } from "@/lib/auth/page";
import { config } from "@/lib/config";
import { personaForUser } from "@/lib/demo/personas";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { s, user } = await pageUser();
  const requests = await s.store.query("verificationRequests", "subjectUserId", user.id);
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  return (
    <AppShell
      user={{ displayName: user.displayName, trustlineId: user.trustlineId }}
      pendingCount={pendingCount}
      demoMode={config.demoMode}
      persona={personaForUser(user.id) ?? { name: user.displayName, role: "new account", tone: "slate" }}
    >
      {children}
    </AppShell>
  );
}
