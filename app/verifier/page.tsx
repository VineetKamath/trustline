import { ConsoleSignIn } from "@/components/org/console-sign-in";
import { OrgShell } from "@/components/org/org-shell";
import { VerifierConsole } from "@/components/org/verifier-console";
import { PageHeader } from "@/components/ui/primitives";
import { pageOrg } from "@/lib/auth/page";
import { config } from "@/lib/config";
import { PEOPLE } from "@/lib/demo/cast";
import { listVerifierRequests } from "@/lib/services/verification";

export const metadata = { title: "Verifier console" };
export const dynamic = "force-dynamic";

export default async function VerifierPage() {
  const { s, org } = await pageOrg("verifier");
  if (!org) {
    return (
      <OrgShell org={null} role="verifier" demoMode={config.demoMode}>
        <ConsoleSignIn role="verifier" orgName="Marketplace B" demoMode={config.demoMode} />
      </OrgShell>
    );
  }
  const recent = await listVerifierRequests(s, org.id);
  const directory = config.demoMode
    ? (
        await Promise.all(
          PEOPLE.map(async (p) => {
            const u = await s.store.get("users", p.id);
            return u ? { trustlineId: u.trustlineId, name: p.name, label: p.label } : null;
          }),
        )
      ).filter((d): d is { trustlineId: string; name: string; label: string } => d !== null)
    : [];
  const subjectHint = config.demoMode
    ? `In real life ${org.name} only ever gets the Trustline ID — never the name. Names are shown here for the demo.`
    : undefined;
  return (
    <OrgShell org={org} role="verifier" demoMode={config.demoMode}>
      <PageHeader
        eyebrow={`${org.name} · Verifier`}
        title="Ask for proof, not data"
        description="Describe what you need in plain language. Trustline turns it into a minimum-disclosure claim, checks it against Cedar policy, and asks the person for a private proof."
        className="mb-8"
      />
      <VerifierConsole orgName={org.name} recent={recent} subjectHint={subjectHint} directory={directory} />
    </OrgShell>
  );
}
