"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  FileBadge2,
  Inbox,
  KeyRound,
  Lock,
  MessageSquareText,
  ScrollText,
  ShieldCheck,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatedCheck } from "@/components/animations";
import { LogoMark } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Mono } from "@/components/ui/primitives";
import { ApiError, api, wait } from "@/lib/client/api";
import { cn } from "@/lib/cn";
import { PURPOSE_LABELS, CLAIMS } from "@/lib/credentials/claims";
import { shortTx } from "@/lib/format";
import type { ProofTrace, RequestView } from "@/lib/services/verification";
import type { PolicyDecision, VerificationResultRecord } from "@/types";

type ResultView = Omit<VerificationResultRecord, "presentation">;

const STEPS = [
  { key: "received", label: "Request received", icon: Inbox },
  { key: "understanding", label: "Understanding request", icon: MessageSquareText },
  { key: "policy", label: "Cedar policy check", icon: ScrollText },
  { key: "credential", label: "Credential found", icon: FileBadge2 },
  { key: "proof", label: "Generating private proof", icon: KeyRound },
  { key: "verifying", label: "Verifying proof", icon: ShieldCheck },
] as const;

function Chip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "accent" | "verified" }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-medium",
        tone === "neutral" && "bg-subtle text-ink-2",
        tone === "accent" && "bg-accent-soft text-accent-strong",
        tone === "verified" && "bg-verified-soft text-verified",
      )}
    >
      {children}
    </span>
  );
}

function ProofVisual({ privateValue, threshold, done, trace }: { privateValue: string; threshold: string; done: boolean; trace: ProofTrace | null }) {
  return (
    <div className="mt-3 space-y-3">
      <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-1.5">
        <div className="flex flex-col items-center justify-center rounded-xl border border-line bg-surface px-2 py-3 text-center">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">Private value</span>
          <span className="mt-1 inline-flex items-center gap-1 text-[22px] font-semibold tabular text-ink">
            <Lock className="size-3.5 text-muted" />
            {privateValue}
          </span>
        </div>
        <ArrowRight className="size-4 self-center text-faint" />
        <div className="flex flex-col items-center justify-center rounded-xl border border-line bg-surface px-2 py-3 text-center">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">Request</span>
          <span className="mt-1 text-[22px] font-semibold tabular text-ink">≥ {threshold}</span>
        </div>
        <ArrowRight className="size-4 self-center text-faint" />
        <div
          className={cn(
            "flex flex-col items-center justify-center rounded-xl border px-2 py-3 text-center transition-colors duration-500",
            done ? "border-verified-line bg-verified-soft" : "border-line bg-surface",
          )}
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">Proof</span>
          <AnimatePresence mode="wait">
            {done ? (
              <motion.span
                key="valid"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-1 text-[17px] font-semibold text-verified"
              >
                VALID
              </motion.span>
            ) : (
              <motion.span key="gen" exit={{ opacity: 0 }} className="mt-2 flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="size-1.5 rounded-full bg-accent"
                    animate={{ opacity: [0.25, 1, 0.25] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="relative h-8 overflow-hidden rounded-lg bg-subtle">
        <div className="absolute inset-0 flex items-center gap-[3px] px-2">
          {Array.from({ length: 24 }).map((_, i) => (
            <motion.span
              key={i}
              className="h-3.5 flex-1 rounded-[3px] bg-accent"
              initial={{ opacity: 0.12 }}
              animate={{ opacity: done ? 0.85 : [0.12, 0.8, 0.12] }}
              transition={done ? { duration: 0.3, delay: i * 0.01 } : { duration: 1.2, repeat: Infinity, delay: i * 0.05 }}
            />
          ))}
        </div>
      </div>
      <p className="text-[12.5px] leading-relaxed text-muted">
        {privateValue} stays in your wallet. The verifier receives {trace?.bitCommitments ?? 24} bit commitments and a
        zero-knowledge range proof{trace?.proofBytes ? ` (${(trace.proofBytes / 1024).toFixed(1)} KB, ${trace.proofMs} ms)` : ""}.
      </p>
    </div>
  );
}

export function VerificationFlow({ request, onDone }: { request: RequestView; onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const [policy, setPolicy] = useState<PolicyDecision | null>(null);
  const [trace, setTrace] = useState<ProofTrace | null>(null);
  const [result, setResult] = useState<ResultView | null>(null);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const s = request.structured;
  const threshold = s.threshold !== undefined ? (s.claim && CLAIMS[s.claim].unit === "percent" ? `${s.threshold}%` : String(s.threshold)) : "";

  const run = useCallback(async () => {
    try {
      await wait(750);
      setIndex(1);
      await wait(1100);
      setIndex(2);
      const [approve] = await Promise.all([
        api<{ policy: PolicyDecision }>("/api/verification/approve", { body: { requestId: request.id } }),
        wait(1100),
      ]);
      setPolicy(approve.policy);
      await wait(350);
      setIndex(3);
      const [prove] = await Promise.all([
        api<{ result: ResultView; trace: ProofTrace }>("/api/verification/prove", { body: { requestId: request.id } }),
        wait(1000),
      ]);
      setTrace(prove.trace);
      setResult(prove.result);
      if (prove.result.outcome === "FAILED" && !prove.result.checks.credentialActive) {
        await wait(900);
        setFinished(true);
        return;
      }
      await wait(500);
      setIndex(4);
      await wait(prove.result.outcome === "NOT_SATISFIED" ? 1200 : 2000);
      if (prove.result.outcome === "NOT_SATISFIED") {
        setFinished(true);
        return;
      }
      setIndex(5);
      await wait(1400);
      setIndex(6);
      await wait(400);
      setFinished(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Verification could not be completed");
    }
  }, [request.id]);

  useEffect(() => {
    // Guard against React StrictMode double-invocation: the flow must run once.
    if (started.current) return;
    started.current = true;
    void run();
  }, [run]);

  const verified = result?.outcome === "VERIFIED";

  return (
    <motion.div
      className="fixed inset-0 z-[90] overflow-y-auto bg-canvas"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      role="dialog"
      aria-modal="true"
      aria-label="Private verification"
    >
      <div className="mx-auto flex min-h-full w-full max-w-[480px] flex-col px-5 pb-10 pt-8 sm:pt-14">
        <div className="flex flex-col items-center text-center">
          <LogoMark size={32} />
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-faint">Private verification</p>
          <p className="mt-5 text-[14px] text-muted">{request.verifierName} asks:</p>
          <p className="mt-1 text-[24px] font-semibold leading-tight tracking-[-0.025em] text-ink">“{request.label}?”</p>
        </div>

        <AnimatePresence mode="wait">
          {!finished && !error ? (
            <motion.ol
              key="pipeline"
              className="relative mt-9 space-y-1"
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {STEPS.map((step, i) => {
                const state = i < index ? "done" : i === index ? "active" : "pending";
                const Icon = step.icon;
                return (
                  <li key={step.key} className="relative flex gap-4">
                    <div className="relative flex flex-col items-center">
                      <motion.span
                        className={cn(
                          "relative z-10 inline-flex size-9 items-center justify-center rounded-full border transition-colors duration-300",
                          state === "done" && "border-verified bg-verified text-white",
                          state === "active" && "border-accent bg-surface text-accent",
                          state === "pending" && "border-line bg-surface text-faint",
                        )}
                        animate={state === "active" ? { boxShadow: ["0 0 0 0 rgb(61 77 214 / 0.25)", "0 0 0 8px rgb(61 77 214 / 0)"] } : { boxShadow: "0 0 0 0 rgb(0 0 0 / 0)" }}
                        transition={state === "active" ? { duration: 1.4, repeat: Infinity } : { duration: 0.2 }}
                      >
                        {state === "done" ? <Check className="size-4" strokeWidth={3} /> : <Icon className="size-4" />}
                      </motion.span>
                      {i < STEPS.length - 1 ? (
                        <span className="relative my-1 w-px flex-1 bg-line">
                          <motion.span
                            className="absolute inset-x-0 top-0 bg-verified"
                            initial={{ height: 0 }}
                            animate={{ height: i < index ? "100%" : 0 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                          />
                        </span>
                      ) : null}
                    </div>
                    <div className={cn("min-w-0 flex-1 pb-5 pt-1.5", state === "pending" && "opacity-45")}>
                      <p className={cn("text-[15px] font-medium", state === "active" ? "text-ink" : "text-ink-2")}>{step.label}</p>
                      <AnimatePresence initial={false}>
                        {state !== "pending" ? (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                            className="overflow-hidden"
                          >
                            {step.key === "received" ? (
                              <p className="mt-1 text-[13px] text-muted">From {request.verifierName} · for {request.subjectTrustlineId}</p>
                            ) : null}
                            {step.key === "understanding" ? (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                <Chip>{s.claim ? CLAIMS[s.claim].label : "—"}</Chip>
                                <Chip tone="accent">≥ {threshold}</Chip>
                                <Chip>{PURPOSE_LABELS[s.purpose]}</Chip>
                              </div>
                            ) : null}
                            {step.key === "policy" ? (
                              policy ? (
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                  <Chip tone="verified">{policy.decision === "ALLOW" ? "AUTHORIZED" : "DENIED"}</Chip>
                                  <Mono className="text-muted">{request.policy.determiningPolicies[0] ?? "policy"}</Mono>
                                </div>
                              ) : (
                                <p className="mt-1 text-[13px] text-muted">Evaluating Cedar policies…</p>
                              )
                            ) : null}
                            {step.key === "credential" ? (
                              trace?.credential ? (
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                  <Chip>{trace.credential.title}</Chip>
                                  <Chip>{trace.credential.issuerName}</Chip>
                                  <Chip tone={trace.credential.chainStatus === "ACTIVE" ? "verified" : "neutral"}>
                                    Ledger: {trace.credential.chainStatus}
                                  </Chip>
                                </div>
                              ) : (
                                <p className="mt-1 text-[13px] text-muted">Searching your wallet…</p>
                              )
                            ) : null}
                            {step.key === "proof" && trace?.privateValue ? (
                              <ProofVisual
                                privateValue={trace.privateValue}
                                threshold={threshold}
                                done={index > 4 && verified}
                                trace={trace}
                              />
                            ) : null}
                            {step.key === "verifying" ? (
                              <div className="mt-2 grid grid-cols-2 gap-1.5">
                                {["Commitment matches ledger", "Issuer signature", "Holder binding", "Range proof"].map((c, ci) => (
                                  <motion.span
                                    key={c}
                                    initial={{ opacity: 0, x: -4 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.15 + ci * 0.2 }}
                                    className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-2"
                                  >
                                    <Check className="size-3.5 text-verified" strokeWidth={3} /> {c}
                                  </motion.span>
                                ))}
                              </div>
                            ) : null}
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </div>
                  </li>
                );
              })}
            </motion.ol>
          ) : null}

          {finished && result ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="mt-10 flex flex-1 flex-col"
            >
              {verified ? (
                <>
                  <div className="flex flex-col items-center text-center">
                    <AnimatedCheck size={88} />
                    <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.2em] text-verified">Verified</p>
                    <p className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-ink">{result.claimLabel}</p>
                  </div>
                  <div className="mt-8 divide-y divide-line rounded-[20px] border border-line bg-surface shadow-card">
                    {[
                      ["Identity revealed", "NO", false],
                      ["History revealed", "NO", false],
                      ["Transaction values", "NO", false],
                      ["Proof", "VALID", true],
                      ["Blockchain credential", "VALID", true],
                    ].map(([label, value, good], i) => (
                      <motion.div
                        key={label as string}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + i * 0.08 }}
                        className="flex items-center justify-between px-5 py-3.5"
                      >
                        <span className="text-[14.5px] text-ink-2">{label}</span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 text-[13px] font-semibold tracking-wide",
                            good ? "text-verified" : "text-ink",
                          )}
                        >
                          {good ? <Check className="size-4" strokeWidth={3} /> : <X className="size-4 text-muted" strokeWidth={2.5} />}
                          {value}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                  <p className="mt-4 text-center text-[12.5px] text-muted">
                    {request.verifierName} received “{result.claimLabel}” and nothing else.
                    {result.blockchainTxId ? (
                      <>
                        {" "}
                        Credential tx <Mono>{shortTx(result.blockchainTxId)}</Mono>
                      </>
                    ) : null}
                  </p>
                </>
              ) : (
                <div className="flex flex-col items-center text-center">
                  <span className="inline-flex size-[72px] items-center justify-center rounded-full bg-caution-soft text-caution">
                    <X className="size-8" strokeWidth={2.5} />
                  </span>
                  <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.2em] text-caution">
                    {result.outcome === "NOT_SATISFIED" ? "Not met" : "Verification failed"}
                  </p>
                  <p className="mt-2 text-[22px] font-semibold tracking-[-0.02em]">{result.claimLabel}</p>
                  <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-muted">{result.failureReason}</p>
                  {result.chainStatus === "REVOKED" ? (
                    <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-danger-line bg-danger-soft px-3 py-1 text-[12.5px] font-medium text-danger">
                      Blockchain status: REVOKED
                    </span>
                  ) : null}
                  <p className="mt-6 text-[13px] text-muted">No private data was disclosed.</p>
                </div>
              )}
              <div className="mt-auto pt-10">
                <Button block size="lg" onClick={onDone}>
                  Done
                </Button>
              </div>
            </motion.div>
          ) : null}

          {error ? (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-12 text-center">
              <p className="text-[15px] font-medium text-ink">{error}</p>
              <p className="mt-2 text-sm text-muted">Nothing was shared.</p>
              <Button className="mt-8" variant="secondary" onClick={onDone}>
                Close
              </Button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
