import { CLAIMS, PURPOSE_LABELS, claimLabel } from "@/lib/credentials/claims";
import type { ClaimKey, Purpose, StructuredRequest, SubjectRole } from "@/types";
import type { InterpretContext, RequestInterpreter } from "./interpreter";

/**
 * Deterministic interpreter used when AGENT_MODE=local. It implements the
 * same output contract as the Strands agent (services/strands-agent) so the
 * rest of the pipeline — validation, Cedar, proof — is identical.
 *
 * It intentionally reports over-broad requests faithfully (e.g. "full
 * history") instead of silently narrowing them, so that Cedar makes and
 * records the DENY decision.
 */

const SELLER_WORDS =
  /\b(seller|host|hosts|vendor|provider|merchant|landlord|owner|freelancer|contractor|driver|store|shop|restaurant|hotel|airline|agent|courier|venue|clinic|salon|tutor|guide|sitter|space|studio|operator|supplier|professional|company)\b/;
const BUYER_WORDS =
  /\b(buyer|guest|customer|renter|tenant|rider|passenger|client|shopper|diner|traveller|traveler|student|patient|member|organiser|organizer|sender|homeowner)\b/;
/** Seller words that describe a service provider (rather than a marketplace seller). */
const PROVIDER_WORDS =
  /\b(host|hosts|provider|landlord|owner|freelancer|contractor|driver|store|shop|restaurant|hotel|airline|agent|courier|venue|clinic|salon|tutor|guide|sitter|space|studio|operator|supplier|professional|company)\b/;

const FULL_HISTORY = [
  /\b(complete|full|entire|whole|all(?: of)?|every)\b[^.?!]{0,40}\b(history|transactions?|bookings?|orders?|records?|activity|purchases?|reviews?)\b/,
  /\b(list|show|give|send|export|share|dump|see)\b[^.?!]{0,30}\b(their|his|her|the)\b[^.?!]{0,30}\b(transactions?|bookings?|orders?|history|purchases?)\b/,
  /\b(transaction|booking|order|purchase|payment)\s+history\b/,
];
const IDENTITY =
  /\b(real name|full name|name|phone|mobile|e-?mail|address|contact|aadhaar|passport|pan card|id card|identity|date of birth|dob|who (is|are) (they|this))\b/;
const RAW_VALUE = /\b(exact|exactly|precise|how many|what is (the|their) (number|count)|total number|actual number)\b/;
const VAGUE = /\b(trust(worthy)?|reliable|legit(imate)?|safe|genuine|honest|scam(mer)?|good|reputable|okay|ok)\b/;

function detectRole(text: string): SubjectRole {
  if (SELLER_WORDS.test(text)) return "seller";
  if (BUYER_WORDS.test(text)) return "buyer";
  return "buyer";
}

function detectThreshold(text: string): { value: number; percent: boolean } | null {
  const percent = text.match(/(\d{1,3})\s*(%|percent)/);
  if (percent) return { value: Math.min(100, Number(percent[1])), percent: true };
  const patterns: [RegExp, number][] = [
    [/(?:at least|minimum(?: of)?|min\.?|no fewer than|not less than|>=|≥)\s*(\d{1,6})/, 0],
    [/(?:more than|over|above|greater than|>)\s*(\d{1,6})/, 1],
    [/(\d{1,6})\s*(?:\+|or more|plus)/, 0],
  ];
  for (const [re, offset] of patterns) {
    const m = text.match(re);
    if (m) return { value: Number(m[1]) + offset, percent: false };
  }
  return null;
}

function detectClaim(text: string, role: SubjectRole, percent: boolean): ClaimKey | null {
  const provider = role === "seller" && PROVIDER_WORDS.test(text);
  if (percent) {
    if (/\b(pay|pays|paid|payment|payments)\b/.test(text)) return "payment_reliability_pct";
    if (role === "buyer" && /(reliab|show(ed|s)? up|no-?show|honou?r|turn(ed)? up|attend)/.test(text))
      return "booking_reliability_pct";
    if (provider) return "provider_completion_pct";
    if (role === "seller") return "seller_completion_pct";
    return "booking_reliability_pct";
  }
  if (/\btransactions?\b/.test(text)) return "successful_transactions";
  if (
    provider &&
    /\b(bookings?|stays?|guests?|orders?|deliver(?:y|ies|ed)|shipments?|parcels?|rides?|rentals?|reservations?|jobs?|projects?|flights?|seats?|tours?|sessions?|class(?:es)?|visits?|appointments?|desks?|events?|slots?)\b/.test(
      text,
    )
  )
    return "completed_bookings_hosted";
  if (/\b(hosted|hosting)\b/.test(text)) return "completed_bookings_hosted";
  if (/\b(stays?|hotels?|nights?|check-?ins?)\b/.test(text)) return "completed_stays";
  if (/\b(projects?|gigs?|freelance|contracts?|jobs?)\b/.test(text)) return "completed_projects";
  if (
    /\b(sales?|orders?|purchases?|deals?|trades?|bookings?|reservations?|rides?|rentals?|flights?|seats?|tours?|sessions?|class(?:es)?|visits?|appointments?|deliver(?:y|ies|ed)|shipments?|parcels?|desks?|events?|slots?)\b/.test(
      text,
    )
  )
    return "successful_transactions";
  return null;
}

function purposeFor(claim: ClaimKey | null, role: SubjectRole, text = ""): Purpose {
  if (claim === "completed_stays") return "guest_verification";
  if ((claim === "completed_bookings_hosted" || claim === "provider_completion_pct") && /\bhosts?\b/.test(text))
    return "host_verification";
  if (claim === "completed_projects") return "freelancer_verification";
  return role === "seller" ? "seller_verification" : "buyer_verification";
}

function predicate(claim: ClaimKey, threshold: number, role: SubjectRole, text = ""): StructuredRequest {
  const purpose = purposeFor(claim, role, text);
  const def = CLAIMS[claim];
  const who = role === "seller" ? "seller" : "buyer";
  return {
    kind: "predicate",
    claim,
    operator: ">=",
    threshold,
    purpose,
    subjectRole: role,
    summary:
      def.unit === "percent"
        ? `Prove the ${who}'s ${def.noun} is at least ${threshold}%. Result only — no counts, identity or history.`
        : `Prove the ${who} has at least ${threshold} ${def.noun}. Result only — the exact number stays private.`,
  };
}

function suggestionsFor(role: SubjectRole): StructuredRequest[] {
  return role === "seller"
    ? [
        predicate("successful_transactions", 20, "seller"),
        predicate("seller_completion_pct", 95, "seller"),
        predicate("completed_bookings_hosted", 50, "seller"),
      ]
    : [predicate("successful_transactions", 20, "buyer"), predicate("booking_reliability_pct", 90, "buyer")];
}

export function interpretLocally(raw: string): StructuredRequest {
  const text = raw.toLowerCase().replace(/\s+/g, " ").trim();
  const role = detectRole(text);
  const threshold = detectThreshold(text);

  if (!threshold) {
    for (const re of FULL_HISTORY) {
      if (re.test(text)) {
        return {
          kind: "full_history",
          purpose: purposeFor(null, role),
          subjectRole: role,
          requestedData: ["complete transaction history"],
          summary: `Requests the ${role}'s complete transaction history. This exceeds a minimum-disclosure claim.`,
        };
      }
    }
    if (IDENTITY.test(text)) {
      return {
        kind: "identity",
        purpose: purposeFor(null, role),
        subjectRole: role,
        requestedData: ["personal identity details"],
        summary: `Requests personal identity information about the ${role}.`,
      };
    }
  }

  const claim = detectClaim(text, role, threshold?.percent ?? false);

  if (RAW_VALUE.test(text) && !threshold) {
    return {
      kind: "raw_value",
      claim: claim ?? "successful_transactions",
      purpose: purposeFor(claim, role),
      subjectRole: role,
      requestedData: [`exact ${CLAIMS[claim ?? "successful_transactions"].noun} count`],
      summary: `Requests the exact private value rather than a yes/no claim.`,
    };
  }

  if (claim && threshold) return predicate(claim, threshold.value, role, text);

  if (claim && !threshold) {
    const def = CLAIMS[claim];
    const defaultThreshold = def.unit === "percent" ? 90 : 20;
    return {
      kind: "clarification",
      purpose: purposeFor(claim, role),
      subjectRole: role,
      summary: `Trustline proves thresholds, not exact values. Choose the minimum you need.`,
      suggestions: [predicate(claim, defaultThreshold, role), ...suggestionsFor(role).filter((s) => s.claim !== claim)].slice(0, 3),
    };
  }

  if (VAGUE.test(text) || text.length > 0) {
    return {
      kind: "clarification",
      purpose: purposeFor(null, role),
      subjectRole: role,
      summary:
        role === "seller"
          ? "Trust isn't one number. These verifiable facts are relevant to a seller:"
          : "Trust isn't one number. These verifiable facts are relevant to a buyer:",
      suggestions: suggestionsFor(role),
    };
  }

  return {
    kind: "unsupported",
    purpose: purposeFor(null, role),
    subjectRole: role,
    summary: "This request does not map to a claim Trustline can prove.",
  };
}

export class LocalRequestInterpreter implements RequestInterpreter {
  readonly engine = "local-deterministic" as const;
  async interpret(text: string, context: InterpretContext): Promise<StructuredRequest> {
    void context;
    return interpretLocally(text);
  }
}

export function describeRequest(s: StructuredRequest): string {
  if (s.kind === "predicate" && s.claim && s.threshold !== undefined) {
    return `${claimLabel(s.claim, s.threshold)} · ${PURPOSE_LABELS[s.purpose]}`;
  }
  return s.summary;
}
