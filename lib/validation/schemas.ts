import { z } from "zod";
import { REVOCATION_REASONS } from "@/contracts/trustline-chaincode/src/types";

export const trustlineIdSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^TL-[0-9A-F]{4}$/, "Trustline IDs look like TL-7F4A");

export const idSchema = z.string().regex(/^[A-Za-z0-9_-]{3,64}$/, "Invalid identifier");

export const claimKeySchema = z.enum([
  "successful_transactions",
  "completed_stays",
  "completed_projects",
  "completed_bookings_hosted",
  "booking_reliability_pct",
  "seller_completion_pct",
  "provider_completion_pct",
  "payment_reliability_pct",
]);

export const purposeSchema = z.enum([
  "buyer_verification",
  "seller_verification",
  "guest_verification",
  "host_verification",
  "freelancer_verification",
]);

const baseStructured = z.object({
  kind: z.enum(["predicate", "full_history", "identity", "raw_value", "clarification", "unsupported"]),
  claim: claimKeySchema.optional(),
  operator: z.literal(">=").optional(),
  threshold: z.number().int().min(0).max(100_000).optional(),
  purpose: purposeSchema,
  subjectRole: z.enum(["buyer", "seller"]),
  requestedData: z.array(z.string().max(80)).max(10).optional(),
  summary: z.string().max(400),
});

/** Validates anything produced by the agent before it reaches Cedar. */
export const structuredRequestSchema = baseStructured.extend({
  suggestions: z.array(baseStructured).max(5).optional(),
});

export const interpretBodySchema = z.object({
  text: z.string().trim().min(3, "Describe what you need to verify").max(500),
});

export const verificationRequestBodySchema = z.object({
  subjectTrustlineId: trustlineIdSchema,
  interpretationId: idSchema,
  /** Index into suggestions when the agent asked for clarification. */
  suggestionIndex: z.number().int().min(0).max(4).optional(),
});

export const requestIdBodySchema = z.object({ requestId: idSchema });

export const issueBodySchema = z.object({
  trustlineId: trustlineIdSchema,
  credentialType: z.enum(["SUCCESSFUL_TRANSACTION_COUNT", "COMPLETED_STAY_COUNT", "COMPLETED_PROJECT_COUNT"]),
  value: z.number().int().min(0).max(100_000),
});

export const revokeBodySchema = z.object({
  credentialId: idSchema,
  reason: z.enum(REVOCATION_REASONS as [string, ...string[]]).optional(),
});

export const walletCreateBodySchema = z.object({
  displayName: z.string().trim().min(1).max(60),
});

export const bookingResponseBodySchema = z.object({
  decision: z.enum(["accept", "decline"]),
  reason: z.string().trim().max(200).optional(),
});

export const bookingBodySchema = z.object({
  listingId: idSchema,
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  quantity: z.number().int().min(1).max(30),
});

export const guestFeedbackSchema = z.object({
  serviceCompleted: z.boolean(),
  listingAccurate: z.boolean(),
  hostCancelled: z.boolean(),
});

export const hostFeedbackSchema = z.object({
  guestShowedUp: z.boolean(),
  paidAsAgreed: z.boolean(),
  guestCancelled: z.boolean(),
});

export const feedbackBodySchema = z.discriminatedUnion("side", [
  z.object({ side: z.literal("guest"), feedback: guestFeedbackSchema }),
  z.object({ side: z.literal("host"), feedback: hostFeedbackSchema }),
]);

export const publishClaimsSchema = z.object({
  publishedClaims: z.array(z.enum(["booking_reliability", "seller_completion", "verified_credentials"])).max(5),
});

export const personaBodySchema = z.union([
  z.object({ persona: z.enum(["user", "host", "issuer", "verifier"]) }),
  z.object({ userId: idSchema }),
]);
