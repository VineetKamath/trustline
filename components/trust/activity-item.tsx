import {
  CalendarCheck2,
  CalendarClock,
  CalendarX2,
  CheckCircle2,
  FileBadge2,
  FileX2,
  MessageSquareText,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/format";
import type { ActivityKind, ActivityRecord } from "@/types";

const KIND: Record<ActivityKind, { icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  credential_issued: { icon: FileBadge2, tone: "bg-accent-soft text-accent-strong" },
  credential_revoked: { icon: FileX2, tone: "bg-danger-soft text-danger" },
  verification_requested: { icon: ShieldQuestion, tone: "bg-subtle text-ink-2" },
  verification_approved: { icon: ShieldCheck, tone: "bg-verified-soft text-verified" },
  verification_declined: { icon: XCircle, tone: "bg-subtle text-muted" },
  verification_blocked: { icon: ShieldAlert, tone: "bg-danger-soft text-danger" },
  verification_failed: { icon: XCircle, tone: "bg-caution-soft text-caution" },
  booking_requested: { icon: CalendarClock, tone: "bg-caution-soft text-caution" },
  booking_confirmed: { icon: CalendarCheck2, tone: "bg-subtle text-ink-2" },
  booking_declined: { icon: CalendarX2, tone: "bg-subtle text-muted" },
  booking_completed: { icon: CheckCircle2, tone: "bg-verified-soft text-verified" },
  feedback_submitted: { icon: MessageSquareText, tone: "bg-subtle text-ink-2" },
};

export function ActivityItem({ item, compact }: { item: ActivityRecord; compact?: boolean }) {
  const meta = KIND[item.kind];
  const Icon = meta.icon;
  const [verb, ...rest] = item.title.split(": ");
  const hasVerb = rest.length > 0;
  return (
    <div className={cn("flex gap-3.5", compact ? "py-3" : "py-4")}>
      <span className={cn("mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl", meta.tone)}>
        <Icon className="size-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate text-[14.5px] font-medium text-ink">{item.actor}</p>
          <span className="shrink-0 text-[12px] text-faint" suppressHydrationWarning>
            {timeAgo(item.createdAt)}
          </span>
        </div>
        {hasVerb ? (
          <p className="mt-0.5 text-[14px] leading-snug text-ink-2">
            <span className="text-muted">{verb}: </span>
            {rest.join(": ")}
          </p>
        ) : (
          <p className="mt-0.5 text-[14px] leading-snug text-ink-2">{item.title}</p>
        )}
        {item.detail && !compact ? <p className="mt-1 text-[13px] leading-snug text-muted">{item.detail}</p> : null}
      </div>
    </div>
  );
}
