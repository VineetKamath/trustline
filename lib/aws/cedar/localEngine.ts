import { createRequire } from "node:module";
import type { PolicyDecision } from "@/types";
import type { AuthorizationRequest, PolicyEngine } from "./engine";
import { CEDAR_POLICIES, CEDAR_SCHEMA, POLICY_EXPLANATIONS } from "./policies";

type CedarWasm = typeof import("@cedar-policy/cedar-wasm/nodejs");

let cedar: CedarWasm | null = null;
function loadCedar(): CedarWasm {
  if (!cedar) {
    // Loaded at runtime from node_modules (listed in serverExternalPackages).
    const require = createRequire(import.meta.url);
    cedar = require("@cedar-policy/cedar-wasm/nodejs") as CedarWasm;
  }
  return cedar;
}

export function explainDecision(decision: "ALLOW" | "DENY", determining: string[]): string[] {
  if (determining.length > 0) return determining.map((id) => POLICY_EXPLANATIONS[id] ?? id);
  return decision === "ALLOW"
    ? ["Permitted by policy."]
    : ["No policy permits this request. The request does not meet the minimum-disclosure rules."];
}

/**
 * Evaluates requests with the official Cedar engine (Rust, compiled to WASM).
 * Same policies, same semantics as Amazon Verified Permissions.
 */
export class LocalCedarEngine implements PolicyEngine {
  readonly kind = "cedar-local" as const;

  async authorize(request: AuthorizationRequest): Promise<PolicyDecision> {
    const answer = loadCedar().isAuthorized({
      principal: request.principal,
      action: { type: "Trustline::Action", id: request.action },
      resource: request.resource,
      context: request.context,
      schema: CEDAR_SCHEMA,
      validateRequest: true,
      policies: { staticPolicies: CEDAR_POLICIES },
      entities: request.entities,
    });

    if (answer.type === "failure") {
      // Fail closed: malformed requests are denied.
      return {
        decision: "DENY",
        engine: this.kind,
        action: request.action,
        determiningPolicies: [],
        reasons: ["The request could not be evaluated safely and was denied."],
        evaluatedAt: new Date().toISOString(),
      };
    }

    const decision = answer.response.decision === "allow" ? "ALLOW" : "DENY";
    const determining = answer.response.diagnostics.reason;
    return {
      decision,
      engine: this.kind,
      action: request.action,
      determiningPolicies: determining,
      reasons: explainDecision(decision, determining),
      evaluatedAt: new Date().toISOString(),
    };
  }
}

/** Validates the policy set against the schema (used by tests and CI). */
export function validatePolicies() {
  return loadCedar().validate({
    schema: CEDAR_SCHEMA,
    policies: { staticPolicies: CEDAR_POLICIES },
  });
}
