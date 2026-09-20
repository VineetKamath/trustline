"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Code2, Loader2, ScrollText, ShieldAlert, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatedCheck } from "@/components/animations";
import { Button } from "@/components/ui/button";
import { Badge, Card, Mono, SectionTitle } from "@/components/ui/primitives";
import { StatusBadge } from "@/components/verification/requests-client";
import { ApiError, api } from "@/lib/client/api";
import { cn } from "@/lib/cn";
import { CLAIMS, PURPOSE_LABELS } from "@/lib/credentials/claims";
import { timeAgo } from "@/lib/format";
import type { RequestView } from "@/lib/services/verification";
import type { Interpretation, Presentation, StructuredRequest } from "@/types";

type VerifierRequest = RequestView & { presentation: Presentation | null };

const EXAMPLES = [
  "Does this buyer have at least 20 successful bookings?",
  "Is this guest's booking reliability at least 80%?",
  "Does this driver have at least 500 completed rides?",
  "Is this car owner's completion rate at least 95%?",
  "Is this client's payment reliability at least 90%?",
  "Is this seller trustworthy?",
  "Give me the buyer's complete transaction history.",
  "What is this person's phone number?",
];

const field =
  "w-full rounded-xl border border-line bg-surface px-4 text-[15px] outline-none transition-colors focus:border-accent";

function StructuredView({ s, engine }: { s: StructuredRequest; engine: Interpretation["engine"] }) {
  const overBroad = s.kind === "full_history" || s.kind === "identity" || s.kind === "raw_value";
  return (
    <div className={cn("rounded-2xl border p-4", overBroad ? "border-caution-line bg-caution-soft/60" : "border-line bg-subtle/60")}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-faint">Understood request</span>
        <span className="inline-flex items-center gap-1 text-[11.5px] text-muted">
          <Sparkles className="size-3" /> {engine === "strands-bedrock" ? "Strands agent · Bedrock" : "Strands contract · local mode"}
        </span>
      </div>
      {s.kind === "predicate" && s.claim ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[14px]">
          <dt className="text-muted">Claim</dt>
          <dd className="font-medium">{CLAIMS[s.claim].label}</dd>
          <dt className="text-muted">Condition</dt>
          <dd className="font-mono font-semibold">
            {s.operator} {s.threshold}
            {CLAIMS[s.claim].unit === "percent" ? "%" : ""}
          </dd>
          <dt className="text-muted">Purpose</dt>
          <dd className="font-medium">{PURPOSE_LABELS[s.purpose]}</dd>
          <dt className="text-muted">Disclosure</dt>
          <dd className="font-medium">Yes / no result only</dd>
        </dl>
      ) : overBroad ? (
        <div className="text-[14px]">
          <p className="font-medium text-caution">Requests: {s.requestedData?.join(", ")}</p>
          <p className="mt-1 text-ink-2">{s.summary}</p>
          <p className="mt-2 text-[12.5px] text-muted">The agent reports this faithfully. Cedar decides whether it may proceed.</p>
        </div>
      ) : (
        <p className="text-[14px] text-ink-2">{s.summary}</p>
      )}
    </div>
  );
}

function ResultPanel({ request, onReset }: { request: VerifierRequest; onReset: () => void }) {
  const [showPayload, setShowPayload] = useState(false);
  if (request.status === "DENIED_BY_POLICY") {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="rounded-2xl border border-danger-line bg-danger-soft p-5">
          <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-danger">
            <ShieldAlert className="size-4" /> Request denied
          </p>
          <p className="mt-3 text-[16px] font-semibold text-ink">Reason</p>
          <p className="mt-1 text-[14.5px] text-ink-2">{request.policy.reasons[0]}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge tone="danger">Cedar policy: DENY</Badge>
            {request.policy.determiningPolicies.map((p) => (
              <Mono key={p} className="rounded-md bg-surface px-2 py-0.5 text-muted">
                {p}
              </Mono>
            ))}
          </div>
        </div>
        <p className="text-[13.5px] text-muted">Private history is not disclosed. The holder was notified that this request was blocked.</p>
        <Button variant="secondary" block onClick={onReset}>
          New request
        </Button>
      </motion.div>
    );
  }
  if (request.status === "PENDING" || request.status === "APPROVED") {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-line p-5">
        <div className="flex items-center gap-3">
          <span className="relative inline-flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Loader2 className="size-5 animate-spin" />
          </span>
          <div>
            <p className="text-[15px] font-semibold">
              {request.status === "PENDING" ? "Waiting for the holder's approval" : "Holder approved · verifying proof"}
            </p>
            <p className="text-[13px] text-muted">Cedar authorized this request. {request.subjectTrustlineId} decides whether to answer.</p>
          </div>
        </div>
      </motion.div>
    );
  }
  if (request.status === "DECLINED") {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-line p-5">
          <p className="text-[15px] font-semibold">The holder declined this request</p>
          <p className="mt-1 text-[13.5px] text-muted">No information was shared.</p>
        </div>
        <Button variant="secondary" block onClick={onReset}>
          New request
        </Button>
      </div>
    );
  }
  const r = request.result;
  const verified = request.status === "VERIFIED";
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className={cn("rounded-2xl border p-5", verified ? "border-verified-line bg-verified-soft/50" : "border-caution-line bg-caution-soft/60")}>
        <div className="flex items-center gap-4">
          {verified ? (
            <AnimatedCheck size={52} />
          ) : (
            <span className="inline-flex size-[52px] items-center justify-center rounded-full bg-caution-soft text-caution">
              <X className="size-6" />
            </span>
          )}
          <div>
            <p className={cn("text-[12px] font-semibold uppercase tracking-[0.16em]", verified ? "text-verified" : "text-caution")}>
              {verified ? "Verified" : request.status === "NOT_SATISFIED" ? "Not met" : "Verification failed"}
            </p>
            <p className="text-[21px] font-semibold tracking-[-0.02em]">{verified ? `✓ ${request.label}` : request.label}</p>
          </div>
        </div>
        {!verified && r?.failureReason ? <p className="mt-3 text-[13.5px] text-ink-2">{r.failureReason}</p> : null}
      </div>

      <div className="rounded-2xl border border-line p-4">
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-faint">You did not receive</p>
        <div className="grid grid-cols-2 gap-2 text-[13.5px] sm:grid-cols-4">
          {["The exact value", "Identity", "Transaction history", "Other platforms"].map((x) => (
            <span key={x} className="inline-flex items-center gap-1.5 text-ink-2">
              <X className="size-3.5 text-danger" strokeWidth={2.5} /> {x}
            </span>
          ))}
        </div>
      </div>

      {r ? (
        <div className="grid grid-cols-2 gap-2 text-[12.5px]">
          {(
            [
              ["Cedar authorized", r.checks.policyAuthorized],
              ["Credential on ledger", r.checks.credentialOnChain],
              ["Not revoked", r.checks.credentialActive],
              ["Issuer signature", r.checks.issuerSignatureValid],
              ["Commitment matches", r.checks.commitmentMatchesLedger],
              ["Holder binding", r.checks.holderBindingValid],
              ["Zero-knowledge proof", r.checks.proofValid],
              ["Registered issuer", r.checks.issuerRegistered],
            ] as [string, boolean][]
          ).map(([label, ok]) => (
            <span key={label} className="inline-flex items-center gap-1.5 text-ink-2">
              {ok ? <Check className="size-3.5 text-verified" strokeWidth={3} /> : <X className="size-3.5 text-danger" strokeWidth={3} />}
              {label}
            </span>
          ))}
        </div>
      ) : null}

      {request.presentation ? (
        <div className="rounded-2xl border border-line">
          <button
            onClick={() => setShowPayload((v) => !v)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-[13.5px] font-medium"
          >
            <span className="inline-flex items-center gap-2">
              <Code2 className="size-4" /> Everything you received ({(JSON.stringify(request.presentation).length / 1024).toFixed(1)} KB)
            </span>
            <ChevronDown className={cn("size-4 transition-transform", showPayload && "rotate-180")} />
          </button>
          <AnimatePresence>
            {showPayload ? (
              <motion.pre
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="no-scrollbar max-h-80 overflow-auto border-t border-line bg-subtle/60 p-4 font-mono text-[11px] leading-relaxed text-ink-2"
              >
                {JSON.stringify(
                  {
                    ...request.presentation,
                    proof: {
                      ...request.presentation.proof,
                      bitProofs: `[${request.presentation.proof.bitProofs.length} bit commitments + OR-proofs]`,
                    },
                  },
                  null,
                  2,
                )}
              </motion.pre>
            ) : null}
          </AnimatePresence>
        </div>
      ) : null}

      <Button variant="secondary" block onClick={onReset}>
        New request
      </Button>
    </motion.div>
  );
}

export function VerifierConsole({
  orgName,
  recent,
  subjectHint,
  directory = [],
}: {
  orgName: string;
  recent: RequestView[];
  subjectHint?: string;
  /** Demo only: people to pick from (the verifier would normally receive an ID from a user). */
  directory?: { trustlineId: string; name: string; label: string }[];
}) {
  const router = useRouter();
  const [trustlineId, setTrustlineId] = useState("TL-7F4A");
  const [text, setText] = useState("");
  const [interpretation, setInterpretation] = useState<Interpretation | null>(null);
  const [choice, setChoice] = useState<number | undefined>(undefined);
  const [busy, setBusy] = useState<"interpret" | "request" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState<VerifierRequest | null>(null);

  useEffect(() => {
    if (!request || !["PENDING", "APPROVED"].includes(request.status)) return;
    const id = request.id;
    const timer = window.setInterval(async () => {
      try {
        const res = await api<{ request: VerifierRequest }>(`/api/verification/${id}?as=verifier`);
        if (res.request.status !== "PENDING" && res.request.status !== "APPROVED") {
          setRequest(res.request);
          router.refresh();
        } else if (res.request.status !== request.status) {
          setRequest(res.request);
        }
      } catch {
        /* keep polling */
      }
    }, 1500);
    return () => window.clearInterval(timer);
  }, [request, router]);

  const interpret = async () => {
    setBusy("interpret");
    setError(null);
    setRequest(null);
    setChoice(undefined);
    try {
      const res = await api<{ interpretation: Interpretation }>("/api/agent/interpret", { body: { text } });
      setInterpretation(res.interpretation);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not interpret the request");
    } finally {
      setBusy(null);
    }
  };

  const submit = async () => {
    if (!interpretation) return;
    setBusy("request");
    setError(null);
    try {
      const res = await api<{ request: VerifierRequest }>("/api/verification/request", {
        body: { subjectTrustlineId: trustlineId.trim().toUpperCase(), interpretationId: interpretation.id, suggestionIndex: choice },
      });
      setRequest(res.request);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not create the request");
    } finally {
      setBusy(null);
    }
  };

  const openRequest = async (id: string) => {
    setError(null);
    try {
      const res = await api<{ request: VerifierRequest }>(`/api/verification/${id}?as=verifier`);
      setInterpretation(null);
      setText(res.request.naturalLanguage);
      setTrustlineId(res.request.subjectTrustlineId);
      setRequest(res.request);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not open the request");
    }
  };

  const reset = () => {
    setRequest(null);
    setInterpretation(null);
    setText("");
    setChoice(undefined);
  };

  const s = interpretation?.structured;
  const canSubmit = s && (s.kind !== "clarification" || choice !== undefined) && s.kind !== "unsupported";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
      <Card className="h-fit p-5 sm:p-6">
        <SectionTitle>Verify a Trustline user</SectionTitle>
        <div className="space-y-5">
          {directory.length ? (
            <label className="block text-[13px] font-medium text-ink-2">
              Who to verify <span className="font-normal text-muted">(demo directory)</span>
              <select
                value={directory.some((d) => d.trustlineId === trustlineId.toUpperCase()) ? trustlineId.toUpperCase() : ""}
                onChange={(e) => e.target.value && setTrustlineId(e.target.value)}
                disabled={request !== null}
                className={`${field} mt-1.5 h-12 appearance-none`}
              >
                <option value="">Choose a person…</option>
                {directory.map((d) => (
                  <option key={d.trustlineId} value={d.trustlineId}>
                    {d.name} ({d.label}) — {d.trustlineId}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="block text-[13px] font-medium text-ink-2">
            Trustline ID
            <input
              value={trustlineId}
              onChange={(e) => setTrustlineId(e.target.value)}
              className={`${field} mt-1.5 h-12 font-mono uppercase`}
              disabled={request !== null}
            />
            {subjectHint ? <span className="mt-1.5 block text-[12.5px] font-normal text-muted">{subjectHint}</span> : null}
          </label>
          <div>
            <label className="block text-[13px] font-medium text-ink-2" htmlFor="nl-request">
              What do you need to know?
            </label>
            <textarea
              id="nl-request"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setInterpretation(null);
              }}
              disabled={request !== null}
              rows={3}
              placeholder="I need to know if this seller has at least 20 successful transactions."
              className={`${field} mt-1.5 resize-none py-3 leading-relaxed`}
            />
            <div className="no-scrollbar -mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  disabled={request !== null}
                  onClick={() => {
                    setText(ex);
                    setInterpretation(null);
                    setRequest(null);
                  }}
                  className="h-9 shrink-0 rounded-full border border-line bg-surface px-3.5 text-[12.5px] text-ink-2 transition-colors hover:border-line-strong hover:text-ink disabled:opacity-50"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {!interpretation && !request ? (
            <Button block size="lg" variant="secondary" onClick={interpret} loading={busy === "interpret"} disabled={text.trim().length < 3}>
              <Sparkles /> Understand request
            </Button>
          ) : null}

          <AnimatePresence>
            {interpretation && s ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <StructuredView s={s} engine={interpretation.engine} />
                {s.kind === "clarification" && s.suggestions ? (
                  <div className="space-y-2">
                    {s.suggestions.map((sg, i) => (
                      <button
                        key={i}
                        disabled={request !== null}
                        onClick={() => setChoice(i)}
                        className={cn(
                          "flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-left text-[14px] transition-colors",
                          choice === i ? "border-ink bg-surface shadow-card" : "border-line hover:border-line-strong",
                        )}
                      >
                        <span>
                          <span className="font-medium">
                            {sg.claim ? CLAIMS[sg.claim].label : ""} ≥ {sg.threshold}
                            {sg.claim && CLAIMS[sg.claim].unit === "percent" ? "%" : ""}
                          </span>
                          <span className="block text-[12.5px] text-muted">{PURPOSE_LABELS[sg.purpose]}</span>
                        </span>
                        <span
                          className={cn(
                            "inline-flex size-5 items-center justify-center rounded-full border",
                            choice === i ? "border-ink bg-ink text-white" : "border-line-strong",
                          )}
                        >
                          {choice === i ? <Check className="size-3" strokeWidth={3} /> : null}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {!request ? (
                  <Button block size="lg" onClick={submit} loading={busy === "request"} disabled={!canSubmit}>
                    Request private proof
                  </Button>
                ) : null}
              </motion.div>
            ) : null}
          </AnimatePresence>

          {error ? <p className="text-sm text-danger">{error}</p> : null}
          {request ? <ResultPanel request={request} onReset={reset} /> : null}
        </div>
      </Card>

      <section>
        <SectionTitle>
          <span className="inline-flex items-center gap-2">
            <ScrollText className="size-4" /> {orgName} requests
          </span>
        </SectionTitle>
        <Card className="divide-y divide-line px-4">
          {recent.length === 0 ? <p className="py-6 text-center text-sm text-muted">No requests yet</p> : null}
          {recent.slice(0, 8).map((r) => (
            <button
              key={r.id}
              onClick={() => openRequest(r.id)}
              className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-subtle/50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium">{r.label}</p>
                <p className="truncate text-[12px] text-muted" suppressHydrationWarning>
                  <span className="font-mono">{r.subjectTrustlineId}</span> · {timeAgo(r.createdAt)}
                </p>
              </div>
              <StatusBadge status={r.status} />
            </button>
          ))}
        </Card>
        <p className="mt-2 text-[12.5px] text-muted">Tap a request to see exactly what {orgName} received.</p>
      </section>
    </div>
  );
}
