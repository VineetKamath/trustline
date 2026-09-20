import "server-only";
import type { ActivityKind, ActivityRecord } from "@/types";
import type { Services } from "./context";
import { byNewest, newId, nowIso } from "./util";

export async function recordActivity(
  s: Services,
  entry: {
    ownerId: string;
    kind: ActivityKind;
    actor: string;
    title: string;
    detail?: string;
    ref?: ActivityRecord["ref"];
    at?: string;
  },
): Promise<ActivityRecord> {
  const record: ActivityRecord = {
    id: newId("act"),
    ownerId: entry.ownerId,
    kind: entry.kind,
    actor: entry.actor,
    title: entry.title,
    detail: entry.detail,
    ref: entry.ref,
    createdAt: entry.at ?? nowIso(),
  };
  await s.store.put("activity", record);
  return record;
}

export async function listActivity(s: Services, ownerId: string, limit = 100) {
  const items = await s.store.query("activity", "ownerId", ownerId);
  return items.sort(byNewest).slice(0, limit);
}
