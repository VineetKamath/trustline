"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ScrollText, ShieldX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatedCheck, CountUp } from "@/components/animations";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Badge, Card, Mono, SectionTitle } from "@/components/ui/primitives";
import { StepProgress, type ProgressStep } from "@/components/verification/step-progress";
import { ApiError, api, wait } from "@/lib/client/api";
import { MANUAL_ISSUE_TYPES } from "@/lib/credentials/schemas";
import { formatDate, shortTx } from "@/lib/format";
import type { PolicyDecision } from "@/types";

export interface IssuedRow {
  credentialId: string;
  credentialType: string;
  title: string;
  trustlineId: string;
  status: "ACTIVE" | "REVOKED";
  issuedAt: string;
  revokedAt?: string;
  blockchainTxId: string;
  revocationTxId?: string;
}

const field =
  "mt-1.5 h-12 w-full rounded-xl border border-line bg-surface px-4 text-[15px] outline-none transition-colors focus:border-accent";

export function IssuerConsole({
  orgName,
  stats,
  credentials,
}: {
  orgName: string;
  stats: { issued: number; active: number; revoked: number };
  credentials: IssuedRow[];
}) {
  const router = useRouter();
  const [trustlineId, setTrustlineId] = useState("TL-7F4A");
  const [type, setType] = useState<string>(MANUAL_ISSUE_TYPES[0].type);
  const [value, setValue] = useState("47");
  const [phase, setPhase] = useState<"form" | "issuing" | "done" | "denied">("form");
  const [steps, setSteps] = useState<ProgressStep[]>([]);
  const [current, setCurrent] = useState(0);
  const [denial, setDenial] = useState<PolicyDecision | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<IssuedRow | null>(null);

  const typeLabel = MANUAL_ISSUE_TYPES.find((t) => t.type === type)?.label ?? type;

  const issue = async () => {
    setError(null);
    const n = Number(value);
    if (!/^TL-[0-9A-F]{4}$/i.test(trustlineId.trim())) return setError("Trustline IDs look like TL-7F4A");
    if (!Number.isInteger(n) || n < 0) return setError("Value must be a whole number");
    setPhase("issuing");
    setSteps([
      { label: "Cedar authorization" },
      { label: "Credential created" },
      { label: "Cryptographic commitment generated" },
      { label: "Blockchain transaction submitted" },
      { label: "Blockchain confirmation received" },
      { label: "Credential ACTIVE" },
    ]);
    setCurrent(0);
    try {
      const [res] = await Promise.all([
        api<{
          ok: boolean;
          policy: PolicyDecision;
          receipt?: { txId: string; blockNumber: number };
          credential?: { credentialId: string; claimCommitment: string };
        }>("/api/credentials/issue", { body: { trustlineId: trustlineId.trim().toUpperCase(), credentialType: type, value: n } }),
        wait(700),
      ]);
      if (!res.ok) {
        setDenial(res.policy);
        setPhase("denied");
        return;
      }
      const tx = res.receipt!;
      const cred = res.credential!;
      setSteps([
        { label: "Cedar authorization", detail: <>ALLOW · issuer-issues-registered-types</> },
        { label: "Credential created", detail: <Mono>{cred.credentialId}</Mono> },
        { label: "Cryptographic commitment generated", detail: <Mono>{shortTx(cred.claimCommitment, 12, 8)}</Mono> },
        { label: "Blockchain transaction submitted", detail: <Mono>tx {shortTx(tx.txId, 12, 8)}</Mono> },
        { label: "Blockchain confirmation received", detail: <>Block #{tx.blockNumber}</> },
        { label: "Credential ACTIVE", detail: <>Delivered to {trustlineId.toUpperCase()}&apos;s wallet</> },
      ]);
      for (let i = 1; i <= 6; i++) {
        setCurrent(i);
        await wait(i === 3 || i === 4 ? 750 : 520);
      }
      setPhase("done");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Issuance failed");
      setPhase("form");
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          ["Credentials issued", stats.issued, "text-ink"],
          ["Active", stats.active, "text-verified"],
          ["Revoked", stats.revoked, "text-muted"],
        ].map(([label, n, color]) => (
          <Card key={label as string} className="p-4 sm:p-6">
            <p className="text-[12.5px] text-muted sm:text-[13.5px]">{label}</p>
            <p className={`mt-2 text-[24px] font-semibold tracking-[-0.03em] sm:text-[34px] ${color}`}>
              <CountUp value={n as number} />
            </p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <Card className="h-fit p-5 sm:p-6">
          <SectionTitle>Issue credential</SectionTitle>
          <AnimatePresence mode="wait">
            {phase === "form" ? (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void issue();
                }}
              >
                <label className="block text-[13px] font-medium text-ink-2">
                  User
                  <input value={trustlineId} onChange={(e) => setTrustlineId(e.target.value)} className={`${field} font-mono uppercase`} />
                </label>
                <label className="block text-[13px] font-medium text-ink-2">
                  Credential
                  <select value={type} onChange={(e) => setType(e.target.value)} className={`${field} appearance-none`}>
                    {MANUAL_ISSUE_TYPES.map((t) => (
                      <option key={t.type} value={t.type}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-[13px] font-medium text-ink-2">
                  Value
                  <input inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} className={`${field} tabular`} />
                </label>
                <p className="text-[12.5px] leading-relaxed text-muted">
                  The value is committed with a Pedersen commitment and delivered only to the holder&apos;s wallet. The ledger
                  receives a hash — never “{value || "0"}”.
                </p>
                {error ? <p className="text-sm text-danger">{error}</p> : null}
                <Button type="submit" block size="lg">
                  Issue credential
                </Button>
              </motion.form>
            ) : phase === "denied" && denial ? (
              <motion.div key="denied" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="rounded-2xl border border-danger-line bg-danger-soft p-4">
                  <p className="flex items-center gap-2 text-[15px] font-semibold text-danger">
                    <ShieldX className="size-5" /> Cedar policy: DENY
                  </p>
                  <p className="mt-2 text-[14px] text-ink-2">
                    {orgName} is not registered to issue “{typeLabel}” credentials. Nothing was written to the ledger.
                  </p>
                </div>
                <Button variant="secondary" block onClick={() => setPhase("form")}>
                  Back
                </Button>
              </motion.div>
            ) : (
              <motion.div key="progress" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <StepProgress steps={steps} current={current} />
                {phase === "done" ? (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-2 space-y-3">
                    <div className="flex items-center gap-3 rounded-2xl bg-verified-soft p-3">
                      <AnimatedCheck size={36} />
                      <p className="text-[14px] font-medium text-verified">
                        {typeLabel}: {value} issued to {trustlineId.toUpperCase()}
                      </p>
                    </div>
                    <Button variant="secondary" block onClick={() => setPhase("form")}>
                      Issue another
                    </Button>
                  </motion.div>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        <section>
          <SectionTitle>
            <span className="inline-flex items-center gap-2">
              <ScrollText className="size-4" /> Issued on this ledger
            </span>
          </SectionTitle>
          <div className="grid gap-3">
            {credentials.map((c) => (
              <Card key={c.credentialId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[14.5px] font-semibold">{c.title}</p>
                    <Badge tone={c.status === "ACTIVE" ? "verified" : "danger"}>{c.status}</Badge>
                  </div>
                  <p className="mt-1 text-[13px] text-muted">
                    <span className="font-mono">{c.trustlineId}</span> · {formatDate(c.issuedAt)} ·{" "}
                    <Mono>tx {shortTx(c.revocationTxId ?? c.blockchainTxId)}</Mono>
                  </p>
                </div>
                {c.status === "ACTIVE" ? (
                  <Button variant="danger-soft" size="sm" className="self-start sm:self-auto" onClick={() => setRevoking(c)}>
                    Revoke
                  </Button>
                ) : null}
              </Card>
            ))}
          </div>
        </section>
      </div>

      <RevokeSheet row={revoking} onClose={() => setRevoking(null)} onDone={() => router.refresh()} />
    </div>
  );
}

function RevokeSheet({ row, onClose, onDone }: { row: IssuedRow | null; onClose: () => void; onDone: () => void }) {
  const [current, setCurrent] = useState(-1);
  const [txId, setTxId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    onClose();
    setTimeout(() => {
      setCurrent(-1);
      setTxId(null);
      setError(null);
    }, 300);
  };

  const revoke = async () => {
    if (!row) return;
    setError(null);
    setCurrent(0);
    try {
      const [res] = await Promise.all([
        api<{ ok: boolean; receipt?: { txId: string } }>("/api/credentials/revoke", { body: { credentialId: row.credentialId } }),
        wait(700),
      ]);
      if (!res.ok) throw new Error("Revocation was denied by policy");
      setTxId(res.receipt?.txId ?? null);
      setCurrent(1);
      await wait(700);
      setCurrent(2);
      await wait(500);
      setCurrent(3);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Revocation failed");
      setCurrent(-1);
    }
  };

  const done = current >= 3;
  return (
    <BottomSheet
      open={row !== null}
      onClose={close}
      title={done ? "Credential revoked" : "Revoke credential?"}
      footer={
        done ? (
          <Button block size="lg" onClick={close}>
            Done
          </Button>
        ) : current >= 0 ? null : (
          <div className="flex gap-3">
            <Button variant="secondary" size="lg" className="flex-1" onClick={close}>
              Cancel
            </Button>
            <Button variant="danger" size="lg" className="flex-1" onClick={revoke}>
              Revoke
            </Button>
          </div>
        )
      }
    >
      {row ? (
        current < 0 ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-subtle/70 p-4">
              <p className="text-[15px] font-semibold">{row.title}</p>
              <p className="mt-1 text-[13px] text-muted">
                Holder <span className="font-mono">{row.trustlineId}</span> · issued {formatDate(row.issuedAt)}
              </p>
            </div>
            <p className="text-[14px] leading-relaxed text-ink-2">
              Revoking this credential prevents future verification using it. The revocation is signed with your issuer
              key and recorded on the ledger.
            </p>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
          </div>
        ) : (
          <StepProgress
            current={current}
            steps={[
              { label: "Revocation submitted", detail: txId ? <Mono>tx {shortTx(txId, 12, 8)}</Mono> : undefined },
              { label: "Blockchain confirmation received" },
              { label: "Blockchain status: REVOKED", detail: "Future proofs using this credential will fail." },
            ]}
          />
        )
      ) : null}
    </BottomSheet>
  );
}
