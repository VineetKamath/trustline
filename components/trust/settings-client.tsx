"use client";

import { LogOut, MonitorPlay } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DEMO_EVENT } from "@/components/navigation/demo-switcher";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client/api";

export function SettingsClient({ demoMode }: { demoMode: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button
        variant="secondary"
        size="lg"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          await api("/api/auth/logout", { body: {} });
          router.push("/");
          router.refresh();
        }}
      >
        <LogOut /> Sign out
      </Button>
      {demoMode ? (
        <Button variant="ghost" size="lg" onClick={() => window.dispatchEvent(new Event(DEMO_EVENT))}>
          <MonitorPlay /> Presenter controls
        </Button>
      ) : null}
    </div>
  );
}
