"use client";

import { motion } from "framer-motion";
import { ArrowRight, KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, OrgMark } from "@/components/ui/primitives";
import { PERSONAS, type Persona } from "@/lib/demo/personas";
import { ApiError, api } from "@/lib/client/api";

const inputClass =
  "mt-1.5 h-12 w-full rounded-xl border border-line bg-surface px-4 text-[15px] outline-none transition-colors focus:border-accent";

export function LoginPanel({ demoMode, authMode }: { demoMode: boolean; authMode: "demo" | "cognito" }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const run = async (key: string, fn: () => Promise<string>) => {
    setBusy(key);
    setError(null);
    try {
      const to = await fn();
      router.push(to);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong");
      setBusy(null);
    }
  };

  const persona = (p: Persona) =>
    run(p, async () => (await api<{ home: string }>("/api/demo/persona", { body: { persona: p } })).home);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-[420px]"
    >
      <h1 className="text-[30px] font-semibold tracking-[-0.03em] text-ink">Welcome to Trustline</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        Your login and your reputation are kept separate. Signing in never reveals who you are to verifiers.
      </p>

      {authMode === "cognito" ? (
        <Card className="mt-8 p-5">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              run("cognito", async () => {
                await api("/api/auth/login", { body: { email, password } });
                return "/dashboard";
              });
            }}
          >
            <label className="block text-[13px] font-medium text-ink-2">
              Email
              <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </label>
            <label className="block text-[13px] font-medium text-ink-2">
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </label>
            <Button type="submit" block size="lg" loading={busy === "cognito"}>
              <KeyRound /> Sign in with Amazon Cognito
            </Button>
          </form>
        </Card>
      ) : null}

      {demoMode ? (
        <div className="mt-8 space-y-6">
          {(["Person", "Organisation"] as const).map((kind) => (
            <div key={kind}>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-faint">
                {kind === "Person" ? "People — sign in to their Trustline" : "Organisations — company consoles"}
              </p>
              <div className="space-y-2.5">
                {PERSONAS.filter((p) => p.kind === kind).map((p) => (
                  <button
                    key={p.key}
                    onClick={() => persona(p.key)}
                    disabled={busy !== null}
                    className="group flex w-full items-center gap-4 rounded-[20px] border border-line bg-surface p-4 text-left shadow-card transition hover:shadow-lift disabled:opacity-60"
                  >
                    <OrgMark monogram={p.monogram} tone={p.tone} size={46} className={kind === "Person" ? "rounded-full" : ""} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[16px] font-semibold text-ink">
                        {p.name} <span className="text-[13.5px] font-medium text-muted">· {p.role}</span>
                      </span>
                      <span className="mt-0.5 block text-[13px] leading-snug text-muted">{p.summary}</span>
                    </span>
                    <ArrowRight className="size-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>
          ))}
          <Link href="/demo" className="inline-flex items-center gap-1.5 text-[14px] font-medium text-accent-strong hover:underline">
            New here? Read the demo guide first <ArrowRight className="size-4" />
          </Link>
        </div>
      ) : null}

      {authMode === "demo" ? (
        <form
          className="mt-8 border-t border-line pt-6"
          onSubmit={(e) => {
            e.preventDefault();
            run("create", async () => {
              await api("/api/wallet/create", { body: { displayName: name } });
              return "/dashboard";
            });
          }}
        >
          <p className="text-[14px] font-medium text-ink">Or create a new Trustline</p>
          <p className="mt-1 text-[13px] text-muted">It starts empty. Reputation is earned through credentials, not declared.</p>
          <div className="mt-3 flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First name"
              aria-label="First name"
              maxLength={60}
              className="h-11 min-w-0 flex-1 rounded-full border border-line bg-surface px-4 text-[15px] outline-none focus:border-accent"
            />
            <Button type="submit" variant="secondary" loading={busy === "create"} disabled={!name.trim()}>
              Create
            </Button>
          </div>
        </form>
      ) : null}

      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
    </motion.div>
  );
}
