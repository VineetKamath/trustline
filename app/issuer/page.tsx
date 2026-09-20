import { ConsoleSignIn } from "@/components/org/console-sign-in";
import { IssuerConsole, type IssuedRow } from "@/components/org/issuer-console";
import { OrgShell } from "@/components/org/org-shell";
import { PageHeader } from "@/components/ui/primitives";
import { pageOrg } from "@/lib/auth/page";
import { config } from "@/lib/config";
import { issuerStats, listIssuedCredentials } from "@/lib/services/credentials";

export const metadata = { title: "Issuer console" };
export const dynamic = "force-dynamic";

export default async function IssuerPage() {
  const { s, org } = await pageOrg("issuer");
  if (!org) {
    return (
      <OrgShell org={null} role="issuer" demoMode={config.demoMode}>
        <ConsoleSignIn role="issuer" orgName="Marketplace A" demoMode={config.demoMode} />
      </OrgShell>
    );
  }
  const [stats, credentials] = await Promise.all([issuerStats(s, org), listIssuedCredentials(s, org.id)]);
  return (
    <OrgShell org={org} role="issuer" demoMode={config.demoMode}>
      <PageHeader
        eyebrow={`${org.name} · Issuer`}
        title="Issue verified behaviour"
        description="Credentials you issue are signed with your registered issuer key and anchored on the Trustline ledger. Holders prove claims about them without revealing the values."
        className="mb-8"
      />
      <IssuerConsole orgName={org.name} stats={stats} credentials={credentials as IssuedRow[]} />
    </OrgShell>
  );
}
