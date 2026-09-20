import { Badge, Card, Mono, PageHeader } from "@/components/ui/primitives";
import { pageUser } from "@/lib/auth/page";
import { LocalBlockchainAdapter } from "@/lib/blockchain/localAdapter";
import { formatDateTime, shortTx } from "@/lib/format";

export const metadata = { title: "Ledger" };

export default async function LedgerPage() {
  const { s } = await pageUser();
  const [txs, height] = await Promise.all([s.chain.recentTransactions(40), s.chain.height()]);
  const integrity = s.chain instanceof LocalBlockchainAdapter ? s.chain.verifyChainIntegrity() : null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`${s.chain.networkName} · ${height >= 0 ? `${height} blocks` : "Fabric"}`}
        title="Ledger explorer"
        description="The exact payloads written to the shared ledger. This is everything any network member can see."
        action={
          integrity === null ? null : (
            <Badge tone={integrity ? "verified" : "danger"}>{integrity ? "Hash chain intact" : "Integrity check failed"}</Badge>
          )
        }
      />
      {txs.length === 0 ? (
        <Card className="p-6 text-sm text-muted">
          Block browsing is not available for this network adapter. Use your Fabric explorer.
        </Card>
      ) : null}
      <div className="space-y-3">
        {txs.map((tx) => (
          <Card key={tx.txId} className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2">
                <Badge tone={tx.fn === "revokeCredential" ? "danger" : tx.fn === "registerIssuer" ? "accent" : "verified"}>
                  {tx.fn}
                </Badge>
                <span className="text-[13px] text-muted">Block #{tx.blockNumber}</span>
              </div>
              <span className="text-[12px] text-muted">{formatDateTime(tx.timestamp)}</span>
            </div>
            <div className="space-y-2 px-4 py-3 sm:px-5">
              <Mono className="block truncate text-muted">tx {shortTx(tx.txId, 16, 10)}</Mono>
              <pre className="no-scrollbar max-h-56 overflow-auto rounded-xl bg-subtle/70 p-3 font-mono text-[11.5px] leading-relaxed text-ink-2">
                {JSON.stringify(tx.payload, null, 2)}
              </pre>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
