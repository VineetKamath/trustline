import type { ReputationContext, ReputationMetric } from "@/types";

/**
 * Transparent, deterministic reputation calculations.
 *
 * There is no universal score and no model in this path. Each behavioural
 * metric is a ratio of counts taken from the holder's *active* credentials,
 * and every metric carries its formula and inputs so the holder can see
 * exactly where a number came from.
 */

export interface CredentialValues {
  credentialId: string;
  credentialType: string;
  issuerName: string;
  status: "ACTIVE" | "REVOKED";
  values: Record<string, number>;
}

const BUYER_TYPES = ["MARKETPLACE_REPUTATION", "CUSTOMER_RECORD", "CUSTOMER_OUTCOME"];
const SELLER_TYPES = ["MARKETPLACE_REPUTATION", "FREELANCE_RECORD", "HOSTING_RECORD", "PROVIDER_RECORD", "PROVIDER_OUTCOME"];
const PROVIDER_TYPES = ["HOSTING_RECORD", "PROVIDER_RECORD", "PROVIDER_OUTCOME"];

/** Below this many transactions a percentage says little; the UI flags it. */
export const MIN_SAMPLE = 5;

function sum(creds: CredentialValues[], ...keys: string[]) {
  let total = 0;
  for (const c of creds) for (const k of keys) total += c.values[k] ?? 0;
  return total;
}

function pct(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 100);
}

function sources(creds: CredentialValues[]) {
  return [...new Set(creds.map((c) => c.issuerName))];
}

function rate(
  key: string,
  label: string,
  numerator: number,
  denominator: number,
  formula: string,
  inputs: { label: string; value: number }[],
  from: CredentialValues[],
): ReputationMetric {
  const value = pct(numerator, denominator);
  return {
    key,
    label,
    value,
    display: value === null ? "—" : `${value}%`,
    formula,
    inputs,
    sources: sources(from),
  };
}

export function disputeLevel(disputes: number, total: number): "Low" | "Moderate" | "High" {
  if (total <= 0) return "Low";
  const r = disputes / total;
  return r < 0.05 ? "Low" : r < 0.15 ? "Moderate" : "High";
}

export function buyerContext(all: CredentialValues[]): ReputationContext {
  const creds = all.filter((c) => c.status === "ACTIVE" && BUYER_TYPES.includes(c.credentialType));
  const completed = sum(creds, "successful_transactions");
  const noShows = sum(creds, "no_shows");
  const cancellations = sum(creds, "cancellations");
  const total = sum(creds, "bookings_total");
  const paid = sum(creds, "payments_completed");
  const disputes = sum(creds, "disputes");

  return {
    role: "buyer",
    title: "Buyer",
    metrics: [
      rate(
        "booking_reliability",
        "Booking reliability",
        completed,
        completed + noShows,
        "completed ÷ (completed + no-shows)",
        [
          { label: "Completed", value: completed },
          { label: "No-shows", value: noShows },
        ],
        creds,
      ),
      rate(
        "payment_reliability",
        "Payment reliability",
        paid,
        completed,
        "payments completed ÷ completed bookings",
        [
          { label: "Paid as agreed", value: paid },
          { label: "Completed", value: completed },
        ],
        creds,
      ),
      rate(
        "cancellation_behaviour",
        "Cancellation behaviour",
        total - cancellations,
        total,
        "bookings not cancelled by you ÷ total bookings",
        [
          { label: "Total bookings", value: total },
          { label: "Cancelled", value: cancellations },
        ],
        creds,
      ),
    ],
    totals: [
      { label: "Completed", value: completed },
      { label: "Cancelled", value: cancellations },
      { label: "No-show", value: noShows },
      { label: "Disputed", value: disputes },
    ],
    sampleSize: total,
    limitedHistory: total > 0 && total < MIN_SAMPLE,
  };
}

export function sellerContext(all: CredentialValues[]): ReputationContext {
  const creds = all.filter((c) => c.status === "ACTIVE" && SELLER_TYPES.includes(c.credentialType));
  const accepted = sum(creds, "seller_orders_accepted", "projects_accepted", "bookings_accepted");
  const completed = sum(creds, "seller_orders_completed", "completed_projects", "completed_bookings");
  const positive = sum(creds, "seller_positive_outcomes", "positive_outcomes", "accurate_listings");
  const cancellations = sum(creds, "seller_cancellations", "host_cancellations") +
    sum(creds.filter((c) => c.credentialType === "FREELANCE_RECORD"), "cancellations");
  const disputes =
    sum(creds, "seller_disputes") + sum(creds.filter((c) => c.credentialType !== "MARKETPLACE_REPUTATION"), "disputes");

  const level = disputeLevel(disputes, accepted);
  const disputeRate = pct(disputes, accepted);
  return {
    role: "seller",
    title: "Seller",
    metrics: [
      rate(
        "transaction_completion",
        "Transaction completion",
        completed,
        accepted,
        "completed ÷ accepted",
        [
          { label: "Completed", value: completed },
          { label: "Accepted", value: accepted },
        ],
        creds,
      ),
      rate(
        "customer_satisfaction",
        "Customer satisfaction",
        positive,
        accepted,
        "positive customer outcomes ÷ accepted",
        [
          { label: "Positive outcomes", value: positive },
          { label: "Accepted", value: accepted },
        ],
        creds,
      ),
      {
        key: "dispute_rate",
        label: "Dispute rate",
        value: disputeRate,
        display: accepted > 0 ? level : "—",
        level,
        formula: "disputes ÷ accepted (Low < 5%, Moderate < 15%)",
        inputs: [
          { label: "Disputes", value: disputes },
          { label: "Accepted", value: accepted },
        ],
        sources: sources(creds),
      },
    ],
    totals: [
      { label: "Completed", value: completed },
      { label: "Cancelled", value: cancellations },
      { label: "Disputed", value: disputes },
      { label: "Accepted", value: accepted },
    ],
    sampleSize: accepted,
    limitedHistory: accepted > 0 && accepted < MIN_SAMPLE,
  };
}

export function guestContext(all: CredentialValues[]): ReputationContext {
  const creds = all.filter((c) => c.status === "ACTIVE" && c.credentialType === "GUEST_STAY_RECORD");
  const completed = sum(creds, "completed_stays");
  const booked = sum(creds, "stays_booked");
  return {
    role: "guest",
    title: "Hotel guest",
    metrics: [
      rate(
        "stay_completion",
        "Stay completion",
        completed,
        booked,
        "completed stays ÷ stays booked",
        [
          { label: "Completed stays", value: completed },
          { label: "Stays booked", value: booked },
        ],
        creds,
      ),
    ],
    totals: [
      { label: "Completed", value: completed },
      { label: "Cancelled", value: sum(creds, "cancellations") },
      { label: "No-show", value: sum(creds, "no_shows") },
    ],
    sampleSize: booked,
    limitedHistory: booked > 0 && booked < MIN_SAMPLE,
  };
}

/** Provider-facing summary used for published seller claims on listings. */
export function hostingSummary(all: CredentialValues[]) {
  const creds = all.filter((c) => c.status === "ACTIVE" && PROVIDER_TYPES.includes(c.credentialType));
  const completed = sum(creds, "completed_bookings");
  const accepted = sum(creds, "bookings_accepted");
  return {
    completedBookings: completed,
    acceptedBookings: accepted,
    cancellations: sum(creds, "host_cancellations"),
    disputes: sum(creds, "disputes"),
    disputeLevel: disputeLevel(sum(creds, "disputes"), accepted),
    completionRate: pct(completed, accepted),
    credentialCount: creds.length,
    issuers: sources(creds),
  };
}
