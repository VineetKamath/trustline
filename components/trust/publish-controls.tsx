"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { api } from "@/lib/client/api";
import { cn } from "@/lib/cn";

const OPTIONS = [
  { key: "booking_reliability", label: "Booking reliability", hint: "Your buyer reliability percentage" },
  { key: "seller_completion", label: "Seller completion", hint: "Your seller completion percentage" },
  { key: "verified_credentials", label: "Credential count & issuers", hint: "How many credentials you hold, and from whom" },
] as const;

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200",
        checked ? "bg-ink" : "bg-line-strong",
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 700, damping: 35 }}
        className={cn("size-6 rounded-full bg-white shadow", checked ? "ml-[22px]" : "ml-0.5")}
      />
    </button>
  );
}

export function PublishControls({ published }: { published: string[] }) {
  const router = useRouter();
  const [state, setState] = useState(published);
  const [pending, startTransition] = useTransition();

  const toggle = async (key: string, on: boolean) => {
    const next = on ? [...state, key] : state.filter((k) => k !== key);
    setState(next);
    await api("/api/profile/publish", {
      body: { publishedClaims: next.filter((k) => OPTIONS.some((o) => o.key === k)) },
    });
    startTransition(() => router.refresh());
  };

  return (
    <div className={cn("divide-y divide-line", pending && "opacity-80")}>
      {OPTIONS.map((o) => (
        <div key={o.key} className="flex min-h-[64px] items-center justify-between gap-4 py-3">
          <div>
            <p className="text-[14.5px] font-medium text-ink">{o.label}</p>
            <p className="text-[12.5px] text-muted">{o.hint}</p>
          </div>
          <Switch checked={state.includes(o.key)} onChange={(v) => toggle(o.key, v)} label={o.label} />
        </div>
      ))}
    </div>
  );
}
