import { SettingsClient } from "@/components/trust/settings-client";
import { Card, Mono, PageHeader, SectionTitle } from "@/components/ui/primitives";
import { pageUser } from "@/lib/auth/page";
import { config } from "@/lib/config";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { s, user } = await pageUser();
  const env = [
    ["Blockchain", `${s.chain.mode} · ${s.chain.networkName}`],
    ["Authorization", s.policy.kind],
    ["Data store", s.store.kind],
    ["Request interpreter", config.agentMode === "strands" ? "Strands agent (Bedrock)" : "Local deterministic"],
  ];
  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader eyebrow="Settings" title="Account" />
      <Card className="p-5 sm:p-6">
        <SectionTitle>Application login</SectionTitle>
        <dl className="divide-y divide-line text-[14px]">
          <div className="flex items-center justify-between py-3">
            <dt className="text-muted">Name (private)</dt>
            <dd className="font-medium">{user.displayName}</dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="text-muted">Sign-in method</dt>
            <dd className="font-medium">{config.authMode === "cognito" ? "Amazon Cognito" : "Demo persona"}</dd>
          </div>
        </dl>
      </Card>
      <Card className="p-5 sm:p-6">
        <SectionTitle>Trustline identity</SectionTitle>
        <dl className="divide-y divide-line text-[14px]">
          <div className="flex items-center justify-between py-3">
            <dt className="text-muted">Trustline ID</dt>
            <dd className="font-mono font-semibold">{user.trustlineId}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="shrink-0 text-muted">Holder public key</dt>
            <dd className="min-w-0 truncate">
              <Mono className="block truncate text-ink-2">{user.holderPublicKey}</Mono>
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          In this MVP your holder key is generated server-side and stored encrypted (AES-256-GCM). A production wallet
          keeps it on your device.
        </p>
      </Card>
      <Card className="p-5 sm:p-6">
        <SectionTitle>Environment</SectionTitle>
        <dl className="divide-y divide-line text-[14px]">
          {env.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 py-3">
              <dt className="text-muted">{k}</dt>
              <dd className="text-right font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <SettingsClient demoMode={config.demoMode} />
    </div>
  );
}
