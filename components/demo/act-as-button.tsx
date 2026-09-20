"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { switchPersona } from "@/components/navigation/demo-switcher";
import { Button } from "@/components/ui/button";
import type { Persona } from "@/lib/demo/personas";

/** Switches to a persona (if given) and opens a page. */
export function ActAsButton({
  persona,
  href,
  label,
  variant = "secondary",
}: {
  persona?: Persona | { userId: string };
  href: string;
  label: string;
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant={variant}
      loading={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const to = persona ? await switchPersona(persona, href) : href;
          router.push(to);
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      {label} <ArrowRight />
    </Button>
  );
}
