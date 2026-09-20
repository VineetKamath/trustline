"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, RotateCcw, Store, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { OrgMark } from "@/components/ui/primitives";
import { api } from "@/lib/client/api";
import { PEOPLE } from "@/lib/demo/cast";
import { PERSONAS, type Persona } from "@/lib/demo/personas";

export const DEMO_EVENT = "trustline:demo-switcher";

/** Switch persona (or any demo person by id), then go to `href` (or their home). */
export async function switchPersona(who: Persona | { userId: string }, href?: string) {
  const body = typeof who === "string" ? { persona: who } : who;
  const res = await api<{ home: string }>("/api/demo/persona", { body });
  return href ?? res.home;
}

/**
 * Hidden presenter controls. Open with Ctrl/⌘ + Shift + D, ?demo=1, the
 * "Switch" button in the persona bar, or Settings. Only in DEMO_MODE.
 */
export function DemoSwitcher() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onEvent = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(DEMO_EVENT, onEvent);
    const t = new URLSearchParams(window.location.search).get("demo") === "1" ? window.setTimeout(() => setOpen(true), 0) : 0;
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(DEMO_EVENT, onEvent);
    };
  }, []);

  const go = useCallback(
    async (who: Persona | { userId: string }) => {
      setBusy(typeof who === "string" ? who : who.userId);
      try {
        const to = await switchPersona(who);
        setOpen(false);
        router.push(to);
        router.refresh();
      } finally {
        setBusy(null);
      }
    },
    [router],
  );

  const reset = async () => {
    if (!window.confirm("Reset all demo data and the local ledger?")) return;
    setBusy("reset");
    try {
      await api("/api/demo/reset", { body: {} });
      router.refresh();
      setOpen(false);
    } finally {
      setBusy(null);
    }
  };

  const link = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          className="fixed bottom-[calc(84px+env(safe-area-inset-bottom))] right-3 z-[80] flex max-h-[min(640px,calc(100dvh-120px))] w-[min(360px,calc(100vw-24px))] flex-col rounded-2xl border border-line bg-surface p-3 font-sans shadow-float lg:bottom-6 lg:right-6"
          role="dialog"
          aria-label="Switch persona"
        >
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">View the demo as…</span>
            <button
              onClick={() => setOpen(false)}
              className="inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-subtle"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {(["Person", "Organisation"] as const).map((kind) => (
            <div key={kind} className="mb-1">
              <p className="px-2 pb-1 pt-1.5 text-[11px] font-medium text-muted">{kind === "Person" ? "People" : "Organisations"}</p>
              {PERSONAS.filter((p) => p.kind === kind).map((p) => (
                <button
                  key={p.key}
                  onClick={() => go(p.key)}
                  disabled={busy !== null}
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-subtle disabled:opacity-60"
                >
                  <OrgMark monogram={p.monogram} tone={p.tone} size={32} />
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-medium text-ink">{p.name}</span>
                    <span className="mt-0.5 block text-[12px] leading-snug text-muted">({p.role})</span>
                  </span>
                </button>
              ))}
            </div>
          ))}
          <p className="px-2 pb-1 pt-2 text-[11px] font-medium text-muted">Everyone else in the demo</p>
          {PEOPLE.filter((p) => p.id !== "usr_vineet" && p.id !== "usr_arjun").map((p) => (
            <button
              key={p.id}
              onClick={() => go({ userId: p.id })}
              disabled={busy !== null}
              className="flex min-h-11 w-full items-start gap-3 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-subtle disabled:opacity-60"
            >
              <OrgMark monogram={p.name[0]} tone={p.tone} size={28} className="mt-0.5 shrink-0 rounded-full" />
              {/* The bracket is the only explanation of who this is, so it wraps rather than truncating. */}
              <span className="min-w-0 text-[13px] leading-snug text-ink">
                {p.name} <span className="text-muted">({p.label})</span>
              </span>
            </button>
          ))}
          </div>
          <div className="mt-1 grid grid-cols-2 gap-2 border-t border-line pt-2">
            <button onClick={() => link("/marketplace")} className="flex h-10 items-center justify-center gap-2 rounded-xl text-[13px] font-medium hover:bg-subtle">
              <Store className="size-4" /> OneCity
            </button>
            <button onClick={() => link("/demo")} className="flex h-10 items-center justify-center gap-2 rounded-xl text-[13px] font-medium hover:bg-subtle">
              <BookOpen className="size-4" /> Demo guide
            </button>
          </div>
          <button
            onClick={reset}
            disabled={busy !== null}
            className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-line text-[13px] font-medium text-muted hover:text-ink"
          >
            <RotateCcw className="size-3.5" /> Reset demo data
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
