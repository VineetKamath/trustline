"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ChevronRight, Link2, Lock, ShieldCheck, ShieldX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatedCheck } from "@/components/animations";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Badge, Card, Mono, OrgMark } from "@/components/ui/primitives";
import { ApiError, api } from "@/lib/client/api";
import { cn } from "@/lib/cn";
import { formatDate, shortTx } from "@/lib/format";
import type { HolderCredentialView } from "@/lib/services/credentials";

export function CredentialStatusBadge({ status }: { status: string }) {
  return status === "ACTIVE" ? (
    <Badge tone="verified">
      <ShieldCheck /> Verified
    </Badge>
  ) : (
    <Badge tone="danger">
      <ShieldX /> Revoked
    </Badge>
  );
}

export function CredentialCard({ credential, index = 0 }: { credential: HolderCredentialView; index?: number }) {
  const [open, setOpen] = useState(false);
  const revoked = credential.status !== "ACTIVE";
  return (
    <>
      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ y: -2 }}
        onClick={() => setOpen(true)}
        className="w-full text-left"
      >
        <Card className={cn("h-full p-5 transition-shadow hover:shadow-lift sm:p-6", revoked && "bg-surface/70")}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <OrgMark monogram={credential.issuerMonogram} tone={credential.issuerTone} size={40} />
              <div className="min-w-0">
                <p className="truncate text-[14.5px] font-semibold text-ink">{credential.title}</p>
                <p className="truncate text-[13px] text-muted">Issued by {credential.issuerName}</p>
              </div>
            </div>
            <CredentialStatusBadge status={credential.status} />
          </div>

          <p
            className={cn(
              "mt-6 text-[26px] font-semibold leading-tight tracking-[-0.03em]",
              revoked ? "text-faint line-through decoration-1" : "text-ink",
            )}
          >
            <span className="tabular">{credential.headline.value}</span>{" "}
            <span className="text-[17px] font-medium tracking-[-0.01em] text-muted">{credential.headline.noun}</span>
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4 text-[12.5px] text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Link2 className="size-3.5" /> Block #{credential.blockNumber}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Lock className="size-3.5" /> Values private
            </span>
            <span>{formatDate(credential.issuedAt)}</span>
            <ChevronRight className="ml-auto size-4 text-faint" />
          </div>
        </Card>
      </motion.button>
      <CredentialSheet credential={credential} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function CredentialSheet({
  credential,
  open,
  onClose,
}: {
  credential: HolderCredentialView;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [phase, setPhase] = useState<"idle" | "submitting" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);

  const close = () => {
    onClose();
    setTimeout(() => {
      setConfirming(false);
      setPhase("idle");
      setError(null);
    }, 300);
  };

  const revoke = async () => {
    setPhase("submitting");
    setError(null);
    try {
      const res = await api<{ ok: boolean; receipt?: { txId: string } }>("/api/credentials/revoke", {
        body: { credentialId: credential.credentialId },
      });
      if (!res.ok) throw new Error("Not permitted by policy");
      setTxId(res.receipt?.txId ?? null);
      setPhase("done");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError || e instanceof Error ? e.message : "Revocation failed");
      setPhase("idle");
    }
  };

  const active = credential.status === "ACTIVE";

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title={confirming ? (phase === "done" ? "Credential revoked" : "Withdraw credential?") : credential.title}
      description={confirming ? undefined : `Issued by ${credential.issuerName} · ${formatDate(credential.issuedAt)}`}
      size="lg"
      footer={
        confirming ? (
          phase === "done" ? (
            <Button block size="lg" onClick={close}>
              Done
            </Button>
          ) : (
            <div className="flex gap-3">
              <Button variant="secondary" size="lg" className="flex-1" onClick={() => setConfirming(false)} disabled={phase === "submitting"}>
                Cancel
              </Button>
              <Button variant="danger" size="lg" className="flex-1" onClick={revoke} loading={phase === "submitting"}>
                Revoke
              </Button>
            </div>
          )
        ) : active ? (
          <Button variant="danger-soft" block size="lg" onClick={() => setConfirming(true)}>
            Revoke credential
          </Button>
        ) : undefined
      }
    >
      {confirming ? (
        phase === "done" ? (
          <div className="flex flex-col items-center py-6 text-center">
            <AnimatedCheck tone="ink" size={64} />
            <p className="mt-4 text-[15px] font-medium">Revocation recorded on the ledger</p>
            <p className="mt-1 text-sm text-muted">Blockchain status: REVOKED</p>
            {txId ? <Mono className="mt-3 rounded-lg bg-subtle px-2.5 py-1 text-muted">tx {shortTx(txId)}</Mono> : null}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-3 rounded-2xl border border-caution-line bg-caution-soft p-4 text-[14px] text-caution">
              <AlertTriangle className="mt-0.5 size-5 shrink-0" />
              <p>Revoking this credential prevents future verification using it. This cannot be undone.</p>
            </div>
            <p className="text-[14px] text-ink-2">
              <span className="font-medium">{credential.headline.text}</span> from {credential.issuerName}. A signed
              revocation will be submitted to the ledger. Your reputation metrics will no longer include it.
            </p>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
          </div>
        )
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <CredentialStatusBadge status={credential.status} />
            <span className="text-[12.5px] text-muted">Ledger: {credential.chainStatus}</span>
          </div>

          <section>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-faint">Private values</p>
            <div className="divide-y divide-line rounded-2xl border border-line">
              {credential.attributes.map((a) => (
                <div key={a.key} className="flex items-center justify-between gap-4 px-4 py-2.5 text-[14px]">
                  <span className="text-ink-2">{a.label}</span>
                  <span className="tabular font-semibold">{a.value}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-muted">
              <Lock className="size-3.5" /> Only you can see these. Verifiers receive yes/no proofs.
            </p>
          </section>

          <section>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-faint">On the ledger</p>
            <dl className="space-y-2.5 rounded-2xl bg-subtle/70 p-4 text-[13px]">
              {[
                ["Credential", credential.credentialId],
                ["Issuance tx", shortTx(credential.blockchainTxId, 10, 8)],
                ["Block", `#${credential.blockNumber}`],
                ["Claim commitment", shortTx(credential.claimCommitment, 10, 8)],
                ["Subject commitment", shortTx(credential.subjectCommitment, 10, 8)],
                ...(credential.revocationTxId ? [["Revocation tx", shortTx(credential.revocationTxId, 10, 8)]] : []),
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4">
                  <dt className="text-muted">{k}</dt>
                  <dd className="truncate font-mono text-[12px] text-ink-2">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
              The ledger stores {credential.attributeCommitmentCount} Pedersen commitments rolled into one hash — never
              the values, your name or your history.
            </p>
          </section>
        </div>
      )}
    </BottomSheet>
  );
}
