"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Inbox, ScrollText, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, Mono, OrgMark, SectionTitle } from "@/components/ui/primitives";
import { ApiError, api } from "@/lib/client/api";
import { requestSentenceParts } from "@/lib/credentials/phrases";
import { timeAgo } from "@/lib/format";
import type { RequestView } from "@/lib/services/verification";
import { PrivacyDisclosure } from "./privacy-disclosure";
import { VerificationFlow } from "./verification-flow";

export function StatusBadge({ status }: { status: RequestView["status"] }) {
  switch (status) {
    case "PENDING":
      return <Badge tone="accent">Awaiting you</Badge>;
    case "VERIFIED":
      return (
        <Badge tone="verified">
          <ShieldCheck /> Verified
        </Badge>
      );
    case "DENIED_BY_POLICY":
      return (
        <Badge tone="danger">
          <ShieldAlert /> Blocked by policy
        </Badge>
      );
    case "DECLINED":
      return <Badge>Declined</Badge>;
    case "NOT_SATISFIED":
      return <Badge tone="caution">Not met</Badge>;
    case "FAILED":
      return <Badge tone="caution">Failed</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

export function VerificationRequestCard({ request, onReview }: { request: RequestView; onReview: () => void }) {
  const [lead, main] = requestSentenceParts(request.structured);
  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}>
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line bg-accent-soft/50 px-5 py-3">
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-accent-strong">New request</span>
          <span className="text-[12px] text-muted" suppressHydrationWarning>
            {timeAgo(request.createdAt)}
          </span>
        </div>
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <OrgMark monogram={request.verifierMonogram} tone={request.verifierTone} size={44} />
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-ink">{request.verifierName}</p>
              <p className="text-[13px] text-muted">wants to verify</p>
            </div>
          </div>
          <p className="mt-5 text-[15px] text-ink-2">{lead}</p>
          <p className="text-[26px] font-semibold leading-tight tracking-[-0.03em] text-ink">{main}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="neutral">{request.purposeLabel}</Badge>
            <Badge tone="verified">
              <ScrollText /> Cedar: authorized
            </Badge>
          </div>
          <Button block size="lg" className="mt-6" onClick={onReview}>
            Review request
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

function HistoryRow({ request, onOpen }: { request: RequestView; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="flex w-full items-center gap-3 py-3.5 text-left transition-colors hover:bg-subtle/50 sm:px-2">
      <OrgMark monogram={request.verifierMonogram} tone={request.verifierTone} size={38} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-medium text-ink">{request.label}</p>
        <p className="truncate text-[12.5px] text-muted" suppressHydrationWarning>
          {request.verifierName} · {timeAgo(request.createdAt)}
        </p>
      </div>
      <StatusBadge status={request.status} />
      <ChevronRight className="hidden size-4 text-faint sm:block" />
    </button>
  );
}

export function RequestsClient({ requests }: { requests: RequestView[] }) {
  const router = useRouter();
  const [reviewing, setReviewing] = useState<RequestView | null>(null);
  const [flow, setFlow] = useState<RequestView | null>(null);
  const [detail, setDetail] = useState<RequestView | null>(null);
  const [declining, setDeclining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pending = requests.filter((r) => r.status === "PENDING");
  const history = requests.filter((r) => r.status !== "PENDING");

  const approve = () => {
    if (!reviewing) return;
    const r = reviewing;
    setReviewing(null);
    setTimeout(() => setFlow(r), 220);
  };

  const decline = async () => {
    if (!reviewing) return;
    setDeclining(true);
    setError(null);
    try {
      await api("/api/verification/deny", { body: { requestId: reviewing.id } });
      setReviewing(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not decline");
    } finally {
      setDeclining(false);
    }
  };

  return (
    <div className="space-y-8">
      <section>
        <SectionTitle>Pending</SectionTitle>
        <AnimatePresence mode="popLayout">
          {pending.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {pending.map((r) => (
                <VerificationRequestCard key={r.id} request={r} onReview={() => setReviewing(r)} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Inbox />}
              title="You're all caught up"
              description="When a platform asks to verify something about you, it will appear here for your approval."
            />
          )}
        </AnimatePresence>
      </section>

      {history.length ? (
        <section>
          <SectionTitle>History</SectionTitle>
          <Card className="divide-y divide-line px-4 sm:px-4">
            {history.map((r) => (
              <HistoryRow key={r.id} request={r} onOpen={() => setDetail(r)} />
            ))}
          </Card>
        </section>
      ) : null}

      <BottomSheet
        open={reviewing !== null}
        onClose={() => setReviewing(null)}
        title={reviewing ? `${reviewing.verifierName} wants to verify` : ""}
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" size="lg" className="flex-1" onClick={decline} loading={declining}>
              Deny
            </Button>
            <Button size="lg" className="flex-[1.4]" onClick={approve} disabled={declining}>
              Approve
            </Button>
          </div>
        }
      >
        {reviewing ? (
          <div className="space-y-5">
            <div className="rounded-2xl bg-subtle/70 p-4">
              <p className="text-[14px] text-ink-2">{requestSentenceParts(reviewing.structured)[0]}</p>
              <p className="text-[22px] font-semibold leading-tight tracking-[-0.02em]">
                {requestSentenceParts(reviewing.structured)[1]}
              </p>
              <p className="mt-3 flex items-start gap-2 text-[12.5px] leading-relaxed text-muted">
                <Sparkles className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  Asked as “{reviewing.naturalLanguage}” — interpreted into a single threshold claim, then authorized by
                  Cedar policy.
                </span>
              </p>
            </div>
            <PrivacyDisclosure receives={`“${reviewing.label}”: yes or no`} />
            {error ? <p className="text-sm text-danger">{error}</p> : null}
          </div>
        ) : null}
      </BottomSheet>

      <BottomSheet
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail?.label}
        description={detail ? `${detail.verifierName} · ${detail.purposeLabel}` : undefined}
      >
        {detail ? <RequestDetail request={detail} /> : null}
      </BottomSheet>

      <AnimatePresence>
        {flow ? (
          <VerificationFlow
            key={flow.id}
            request={flow}
            onDone={() => {
              setFlow(null);
              router.refresh();
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function RequestDetail({ request }: { request: RequestView }) {
  const r = request.result;
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <StatusBadge status={request.status} />
        <span className="text-[12.5px] text-muted" suppressHydrationWarning>
          {timeAgo(request.createdAt)}
        </span>
      </div>
      <div className="rounded-2xl border border-line p-4">
        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-faint">Asked</p>
        <p className="mt-1 text-[14.5px] text-ink-2">“{request.naturalLanguage}”</p>
      </div>
      <div className="rounded-2xl border border-line p-4">
        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-faint">Cedar decision</p>
        <p className="mt-1 text-[15px] font-semibold">{request.policy.decision}</p>
        <p className="mt-1 text-[13.5px] text-muted">{request.policy.reasons[0]}</p>
        {request.policy.determiningPolicies.length ? (
          <Mono className="mt-2 inline-block rounded-md bg-subtle px-2 py-0.5 text-muted">
            {request.policy.determiningPolicies.join(", ")}
          </Mono>
        ) : null}
      </div>
      {r ? (
        <div className="rounded-2xl border border-line p-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-faint">What was shared</p>
          <p className="mt-1 text-[15px] font-semibold">
            {r.outcome === "VERIFIED" ? `✓ ${r.claimLabel}` : r.outcome === "NOT_SATISFIED" ? "Claim not met" : "Nothing"}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[12px]">
            {["Identity", "History", "Values"].map((x) => (
              <div key={x} className="rounded-xl bg-subtle/70 px-2 py-2">
                <p className="font-semibold text-ink">Hidden</p>
                <p className="text-muted">{x}</p>
              </div>
            ))}
          </div>
          {r.failureReason ? <p className="mt-3 text-[13px] text-muted">{r.failureReason}</p> : null}
        </div>
      ) : request.status === "DENIED_BY_POLICY" ? (
        <p className="text-[13.5px] text-muted">
          Trustline refused this request before it reached you. No data was disclosed.
        </p>
      ) : null}
    </div>
  );
}
