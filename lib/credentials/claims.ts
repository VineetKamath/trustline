import type { ClaimKey, Purpose } from "@/types";

/**
 * Provable claims. Each claim is a linear predicate over committed attributes:
 *
 *     Σ coefficient_i · attribute_i  ≥  threshold'
 *
 * Count claims use a single coefficient of 1. Percentage claims such as
 * "booking reliability ≥ 95%" become 100·completed − 95·(completed + no_shows) ≥ 0,
 * which the holder can prove in zero knowledge from the commitments alone.
 */

export interface ClaimDefinition {
  key: ClaimKey;
  label: string;
  unit: "count" | "percent";
  /** Short phrase for results, e.g. "successful transactions". */
  noun: string;
  credentialTypes: string[];
  purposes: Purpose[];
  /** Build the linear predicate for a threshold. */
  predicate(threshold: number): { coefficients: Record<string, number>; threshold: number };
}

const count = (attribute: string) => (threshold: number) => ({
  coefficients: { [attribute]: 1 },
  threshold,
});

export const CLAIMS: Record<ClaimKey, ClaimDefinition> = {
  successful_transactions: {
    key: "successful_transactions",
    label: "Successful transactions",
    unit: "count",
    noun: "successful transactions",
    credentialTypes: ["MARKETPLACE_REPUTATION", "SUCCESSFUL_TRANSACTION_COUNT", "CUSTOMER_RECORD"],
    purposes: ["buyer_verification", "seller_verification"],
    predicate: count("successful_transactions"),
  },
  completed_stays: {
    key: "completed_stays",
    label: "Completed stays",
    unit: "count",
    noun: "completed stays",
    credentialTypes: ["GUEST_STAY_RECORD", "COMPLETED_STAY_COUNT"],
    purposes: ["guest_verification"],
    predicate: count("completed_stays"),
  },
  completed_projects: {
    key: "completed_projects",
    label: "Completed projects",
    unit: "count",
    noun: "completed projects",
    credentialTypes: ["FREELANCE_RECORD", "COMPLETED_PROJECT_COUNT"],
    purposes: ["freelancer_verification", "seller_verification"],
    predicate: count("completed_projects"),
  },
  completed_bookings_hosted: {
    key: "completed_bookings_hosted",
    label: "Completed orders as provider",
    unit: "count",
    noun: "completed orders as provider",
    credentialTypes: ["HOSTING_RECORD", "PROVIDER_RECORD"],
    purposes: ["host_verification", "seller_verification"],
    predicate: count("completed_bookings"),
  },
  booking_reliability_pct: {
    key: "booking_reliability_pct",
    label: "Booking reliability",
    unit: "percent",
    noun: "booking reliability",
    credentialTypes: ["MARKETPLACE_REPUTATION", "CUSTOMER_RECORD"],
    purposes: ["buyer_verification", "guest_verification"],
    // 100·completed ≥ p·(completed + no_shows)
    predicate: (p) => ({
      coefficients: { successful_transactions: 100 - p, no_shows: -p },
      threshold: 0,
    }),
  },
  seller_completion_pct: {
    key: "seller_completion_pct",
    label: "Seller completion rate",
    unit: "percent",
    noun: "seller completion",
    credentialTypes: ["MARKETPLACE_REPUTATION"],
    purposes: ["seller_verification"],
    // 100·completed ≥ p·accepted
    predicate: (p) => ({
      coefficients: { seller_orders_completed: 100, seller_orders_accepted: -p },
      threshold: 0,
    }),
  },
  provider_completion_pct: {
    key: "provider_completion_pct",
    label: "Provider completion rate",
    unit: "percent",
    noun: "provider completion",
    credentialTypes: ["HOSTING_RECORD", "PROVIDER_RECORD"],
    purposes: ["seller_verification", "host_verification"],
    // 100·completed ≥ p·accepted
    predicate: (p) => ({
      coefficients: { completed_bookings: 100, bookings_accepted: -p },
      threshold: 0,
    }),
  },
  payment_reliability_pct: {
    key: "payment_reliability_pct",
    label: "Payment reliability",
    unit: "percent",
    noun: "payment reliability",
    credentialTypes: ["MARKETPLACE_REPUTATION", "CUSTOMER_RECORD"],
    purposes: ["buyer_verification", "freelancer_verification"],
    // 100·paid ≥ p·completed
    predicate: (p) => ({
      coefficients: { payments_completed: 100, successful_transactions: -p },
      threshold: 0,
    }),
  },
};

export const CLAIM_KEYS = Object.keys(CLAIMS) as ClaimKey[];

export function claimLabel(claim: ClaimKey, threshold: number): string {
  const def = CLAIMS[claim];
  return def.unit === "percent" ? `${def.label} ≥ ${threshold}%` : `${threshold}+ ${def.noun}`;
}

export const PURPOSE_LABELS: Record<Purpose, string> = {
  buyer_verification: "Buyer verification",
  seller_verification: "Seller verification",
  guest_verification: "Guest verification",
  host_verification: "Host verification",
  freelancer_verification: "Freelancer verification",
};

/** Evaluate a predicate on plaintext values (holder side only). */
export function evaluatePredicate(
  coefficients: Record<string, number>,
  threshold: number,
  values: Record<string, number>,
): { satisfied: boolean; slack: number } {
  let total = 0;
  for (const [attr, c] of Object.entries(coefficients)) total += c * (values[attr] ?? 0);
  return { satisfied: total >= threshold, slack: total - threshold };
}
