import { Activity } from "lucide-react";
import { ActivityItem } from "@/components/trust/activity-item";
import { Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { pageUser } from "@/lib/auth/page";
import { dayBucket } from "@/lib/format";
import { listActivity } from "@/lib/services/activity";
import type { ActivityRecord } from "@/types";

export const metadata = { title: "Activity" };

export default async function ActivityPage() {
  const { s, user } = await pageUser();
  const items = await listActivity(s, user.id, 200);
  const groups = new Map<string, ActivityRecord[]>();
  for (const item of items) {
    const key = dayBucket(item.createdAt);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Activity"
        title="What happened with your Trustline"
        description="Credentials issued, proofs shared and requests blocked. Private transaction details are never listed here or anywhere else."
      />
      {items.length === 0 ? <EmptyState icon={<Activity />} title="No activity yet" /> : null}
      <div className="max-w-3xl space-y-8">
        {[...groups.entries()].map(([label, group]) => (
          <section key={label}>
            <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-faint">{label}</h2>
            <Card className="divide-y divide-line px-4 sm:px-5">
              {group.map((item) => (
                <ActivityItem key={item.id} item={item} />
              ))}
            </Card>
          </section>
        ))}
      </div>
    </div>
  );
}
