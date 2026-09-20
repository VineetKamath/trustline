"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { api } from "@/lib/client/api";

export function ConsoleSignIn({ role, orgName, demoMode }: { role: "issuer" | "verifier"; orgName: string; demoMode: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Card className="mx-auto mt-10 max-w-md p-6 text-center">
      <p className="text-[19px] font-semibold tracking-tight">{role === "issuer" ? "Issuer" : "Verifier"} console</p>
      <p className="mt-2 text-[14px] text-muted">
        Organisation consoles require a registered {role} account on the Trustline network.
      </p>
      {demoMode ? (
        <Button
          className="mt-6"
          size="lg"
          block
          loading={busy}
          onClick={async () => {
            setBusy(true);
            await api("/api/demo/persona", { body: { persona: role } });
            router.refresh();
          }}
        >
          Continue as {orgName}
        </Button>
      ) : null}
    </Card>
  );
}
