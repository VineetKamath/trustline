import type { PolicyDecision } from "@/types";

export type CedarValue =
  | boolean
  | number
  | string
  | CedarValue[]
  | { __entity: { type: string; id: string } }
  | { [key: string]: CedarValue };

export interface EntityRef {
  type: string;
  id: string;
}

export interface CedarEntity {
  uid: EntityRef;
  attrs: Record<string, CedarValue>;
  parents: EntityRef[];
}

export interface AuthorizationRequest {
  principal: EntityRef;
  /** Action id within Trustline::Action, e.g. "RequestPredicateProof". */
  action: string;
  resource: EntityRef;
  context: Record<string, CedarValue>;
  entities: CedarEntity[];
}

/**
 * The authorization authority. Nothing in Trustline — including the Strands
 * agent — may perform a protected operation without an ALLOW from here.
 */
export interface PolicyEngine {
  readonly kind: PolicyDecision["engine"];
  authorize(request: AuthorizationRequest): Promise<PolicyDecision>;
}

export const entity = (type: string, id: string): { __entity: EntityRef } => ({
  __entity: { type: `Trustline::${type}`, id },
});

export const ref = (type: string, id: string): EntityRef => ({ type: `Trustline::${type}`, id });
