import { CredentialCard } from "@/components/credentials/credential-card";
import { EmptyState, PageHeader, SectionTitle } from "@/components/ui/primitives";
import { pageUser } from "@/lib/auth/page";
import { listHolderCredentials } from "@/lib/services/credentials";
import { FileBadge2 } from "lucide-react";

export const metadata = { title: "Credentials" };

export default async function CredentialsPage() {
  const { s, user } = await pageUser();
  const credentials = await listHolderCredentials(s, user.id);
  const active = credentials.filter((c) => c.status === "ACTIVE");
  const revoked = credentials.filter((c) => c.status !== "ACTIVE");

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`${active.length} active · ${revoked.length} revoked`}
        title="Your credentials"
        description="Behaviour verified by the platforms you've used. Each one is signed by its issuer and anchored on the Trustline ledger."
      />
      {credentials.length === 0 ? (
        <EmptyState
          icon={<FileBadge2 />}
          title="No credentials yet"
          description="Complete a transaction on a Trustline-connected platform and it can issue you a credential."
        />
      ) : null}
      {active.length > 0 ? (
        <section>
          <SectionTitle>Active</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {active.map((c, i) => (
              <CredentialCard key={c.credentialId} credential={c} index={i} />
            ))}
          </div>
        </section>
      ) : null}
      {revoked.length > 0 ? (
        <section>
          <SectionTitle>Revoked</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {revoked.map((c, i) => (
              <CredentialCard key={c.credentialId} credential={c} index={i} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
