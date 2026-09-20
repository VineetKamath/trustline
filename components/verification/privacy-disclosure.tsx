import { Check, X } from "lucide-react";
import { cn } from "@/lib/cn";

export const WITHHELD = ["Your identity", "Your transaction history", "Transaction values", "Unrelated reputation"];

/** "They will receive / will NOT receive" — the heart of every consent screen. */
export function PrivacyDisclosure({
  receives = "The requested verification result only",
  className,
}: {
  receives?: string;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3", className)}>
      <div className="rounded-2xl border border-line p-4">
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-faint">They will not receive</p>
        <ul className="space-y-2.5">
          {WITHHELD.map((w) => (
            <li key={w} className="flex items-center gap-3 text-[14.5px] text-ink-2">
              <span className="inline-flex size-6 items-center justify-center rounded-full bg-danger-soft text-danger">
                <X className="size-3.5" strokeWidth={2.5} />
              </span>
              {w}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl border border-verified-line bg-verified-soft/60 p-4">
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-verified">They will receive</p>
        <p className="flex items-center gap-3 text-[14.5px] font-medium text-ink">
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-verified text-white">
            <Check className="size-3.5" strokeWidth={3} />
          </span>
          {receives}
        </p>
      </div>
    </div>
  );
}
