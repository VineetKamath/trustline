/**
 * Credential schemas. A schema is public (every verifier knows which
 * attributes a credential type carries); the attribute *values* are not.
 */

export interface AttributeSpec {
  key: string;
  label: string;
}

export interface CredentialSchema {
  type: string;
  title: string;
  category: "marketplace" | "hospitality" | "work" | "mobility" | "hosting" | "outcome";
  /** Attribute shown as the headline, e.g. "47 successful transactions". */
  headline: { attribute: string; noun: string };
  attributes: AttributeSpec[];
  description: string;
}

export const CREDENTIAL_SCHEMAS: Record<string, CredentialSchema> = {
  MARKETPLACE_REPUTATION: {
    type: "MARKETPLACE_REPUTATION",
    title: "Marketplace reputation",
    category: "marketplace",
    headline: { attribute: "successful_transactions", noun: "successful transactions" },
    description: "Buying and selling behaviour on a marketplace.",
    attributes: [
      { key: "successful_transactions", label: "Successful transactions" },
      { key: "bookings_total", label: "Total bookings" },
      { key: "cancellations", label: "Cancelled by you" },
      { key: "no_shows", label: "No-shows" },
      { key: "payments_completed", label: "Payments completed" },
      { key: "disputes", label: "Disputes" },
      { key: "seller_orders_accepted", label: "Orders accepted as seller" },
      { key: "seller_orders_completed", label: "Orders completed as seller" },
      { key: "seller_cancellations", label: "Seller cancellations" },
      { key: "seller_positive_outcomes", label: "Positive buyer outcomes" },
      { key: "seller_disputes", label: "Seller disputes" },
    ],
  },
  SUCCESSFUL_TRANSACTION_COUNT: {
    type: "SUCCESSFUL_TRANSACTION_COUNT",
    title: "Transaction history",
    category: "marketplace",
    headline: { attribute: "successful_transactions", noun: "successful transactions" },
    description: "A single verified count of successful transactions.",
    attributes: [{ key: "successful_transactions", label: "Successful transactions" }],
  },
  GUEST_STAY_RECORD: {
    type: "GUEST_STAY_RECORD",
    title: "Hotel guest reputation",
    category: "hospitality",
    headline: { attribute: "completed_stays", noun: "completed stays" },
    description: "Stays booked and honoured as a guest.",
    attributes: [
      { key: "completed_stays", label: "Completed stays" },
      { key: "stays_booked", label: "Stays booked" },
      { key: "cancellations", label: "Cancelled by you" },
      { key: "no_shows", label: "No-shows" },
    ],
  },
  COMPLETED_STAY_COUNT: {
    type: "COMPLETED_STAY_COUNT",
    title: "Stay history",
    category: "hospitality",
    headline: { attribute: "completed_stays", noun: "completed stays" },
    description: "A single verified count of completed stays.",
    attributes: [{ key: "completed_stays", label: "Completed stays" }],
  },
  FREELANCE_RECORD: {
    type: "FREELANCE_RECORD",
    title: "Freelance reputation",
    category: "work",
    headline: { attribute: "completed_projects", noun: "completed projects" },
    description: "Projects accepted and delivered as a freelancer.",
    attributes: [
      { key: "completed_projects", label: "Completed projects" },
      { key: "projects_accepted", label: "Projects accepted" },
      { key: "positive_outcomes", label: "Positive client outcomes" },
      { key: "cancellations", label: "Cancelled by you" },
      { key: "disputes", label: "Disputes" },
    ],
  },
  COMPLETED_PROJECT_COUNT: {
    type: "COMPLETED_PROJECT_COUNT",
    title: "Project history",
    category: "work",
    headline: { attribute: "completed_projects", noun: "completed projects" },
    description: "A single verified count of completed projects.",
    attributes: [{ key: "completed_projects", label: "Completed projects" }],
  },
  HOSTING_RECORD: {
    type: "HOSTING_RECORD",
    title: "Hosting reputation",
    category: "hosting",
    headline: { attribute: "completed_bookings", noun: "completed bookings" },
    description: "Bookings accepted and honoured as a host.",
    attributes: [
      { key: "completed_bookings", label: "Completed bookings" },
      { key: "bookings_accepted", label: "Bookings accepted" },
      { key: "host_cancellations", label: "Host cancellations" },
      { key: "accurate_listings", label: "Listing matched description" },
      { key: "disputes", label: "Disputes" },
    ],
  },
  RIDER_RECORD: {
    type: "RIDER_RECORD",
    title: "Rider reputation",
    category: "mobility",
    headline: { attribute: "completed_rides", noun: "completed rides" },
    description: "Rides booked and taken as a passenger.",
    attributes: [
      { key: "completed_rides", label: "Completed rides" },
      { key: "rides_booked", label: "Rides booked" },
      { key: "no_shows", label: "No-shows" },
    ],
  },
  CUSTOMER_RECORD: {
    type: "CUSTOMER_RECORD",
    title: "Customer record",
    category: "outcome",
    headline: { attribute: "successful_transactions", noun: "completed bookings" },
    description: "How reliably someone shows up, pays and keeps bookings as a customer.",
    attributes: [
      { key: "successful_transactions", label: "Completed" },
      { key: "bookings_total", label: "Total bookings" },
      { key: "cancellations", label: "Cancelled by customer" },
      { key: "no_shows", label: "No-shows" },
      { key: "payments_completed", label: "Payments completed" },
      { key: "disputes", label: "Disputes" },
    ],
  },
  PROVIDER_RECORD: {
    type: "PROVIDER_RECORD",
    title: "Provider record",
    category: "outcome",
    headline: { attribute: "completed_bookings", noun: "completed orders" },
    description: "How reliably someone delivers what they sell or host.",
    attributes: [
      { key: "completed_bookings", label: "Completed" },
      { key: "bookings_accepted", label: "Accepted" },
      { key: "host_cancellations", label: "Cancelled by provider" },
      { key: "accurate_listings", label: "Matched the listing" },
      { key: "disputes", label: "Disputes" },
    ],
  },
  CUSTOMER_OUTCOME: {
    type: "CUSTOMER_OUTCOME",
    title: "Transaction outcome (as customer)",
    category: "outcome",
    headline: { attribute: "successful_transactions", noun: "successful transaction" },
    description: "Outcome of a single transaction, reported by the provider.",
    attributes: [
      { key: "successful_transactions", label: "Successful" },
      { key: "bookings_total", label: "Bookings" },
      { key: "cancellations", label: "Cancelled by customer" },
      { key: "no_shows", label: "No-shows" },
      { key: "payments_completed", label: "Payments completed" },
    ],
  },
  PROVIDER_OUTCOME: {
    type: "PROVIDER_OUTCOME",
    title: "Transaction outcome (as provider)",
    category: "outcome",
    headline: { attribute: "completed_bookings", noun: "completed order" },
    description: "Outcome of a single transaction, reported by the customer.",
    attributes: [
      { key: "completed_bookings", label: "Completed" },
      { key: "bookings_accepted", label: "Accepted" },
      { key: "host_cancellations", label: "Cancelled by provider" },
      { key: "accurate_listings", label: "Matched the listing" },
    ],
  },
};

export function getSchema(type: string): CredentialSchema {
  const schema = CREDENTIAL_SCHEMAS[type];
  if (!schema) throw new Error(`Unknown credential type ${type}`);
  return schema;
}

/** Types an issuer console can issue directly by hand. */
export const MANUAL_ISSUE_TYPES = [
  { type: "SUCCESSFUL_TRANSACTION_COUNT", label: "Successful transactions" },
  { type: "COMPLETED_STAY_COUNT", label: "Completed stays" },
  { type: "COMPLETED_PROJECT_COUNT", label: "Completed projects" },
] as const;
