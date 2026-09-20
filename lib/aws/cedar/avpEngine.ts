import {
  IsAuthorizedCommand,
  VerifiedPermissionsClient,
  type AttributeValue,
  type EntityItem,
} from "@aws-sdk/client-verifiedpermissions";
import { config } from "@/lib/config";
import type { PolicyDecision } from "@/types";
import type { AuthorizationRequest, CedarValue, PolicyEngine } from "./engine";
import { explainDecision } from "./localEngine";

let cachedMap: Record<string, string> | null = null;
function policyNameMap(): Record<string, string> {
  if (!cachedMap) {
    try {
      cachedMap = JSON.parse(process.env.AVP_POLICY_MAP || "{}") as Record<string, string>;
    } catch {
      cachedMap = {};
    }
  }
  return cachedMap;
}

function toAttribute(value: CedarValue): AttributeValue {
  if (typeof value === "boolean") return { boolean: value };
  if (typeof value === "number") return { long: value };
  if (typeof value === "string") return { string: value };
  if (Array.isArray(value)) return { set: value.map(toAttribute) };
  if ("__entity" in value && typeof value.__entity === "object" && !Array.isArray(value.__entity)) {
    const e = value.__entity as { type: string; id: string };
    return { entityIdentifier: { entityType: e.type, entityId: e.id } };
  }
  return {
    record: Object.fromEntries(Object.entries(value as Record<string, CedarValue>).map(([k, v]) => [k, toAttribute(v)])),
  };
}

/**
 * Amazon Verified Permissions engine. The policy store must contain the
 * policies from lib/aws/cedar/policies.ts (see infra/cedar/), with the policy
 * id stored in each policy's description so decisions can be explained.
 */
export class VerifiedPermissionsEngine implements PolicyEngine {
  readonly kind = "amazon-verified-permissions" as const;
  private client = new VerifiedPermissionsClient({ region: config.awsRegion });

  async authorize(request: AuthorizationRequest): Promise<PolicyDecision> {
    if (!config.policyStoreId) throw new Error("VERIFIED_PERMISSIONS_POLICY_STORE is not configured");
    const entityList: EntityItem[] = request.entities.map((e) => ({
      identifier: { entityType: e.uid.type, entityId: e.uid.id },
      attributes: Object.fromEntries(Object.entries(e.attrs).map(([k, v]) => [k, toAttribute(v)])),
      parents: e.parents.map((p) => ({ entityType: p.type, entityId: p.id })),
    }));

    const res = await this.client.send(
      new IsAuthorizedCommand({
        policyStoreId: config.policyStoreId,
        principal: { entityType: request.principal.type, entityId: request.principal.id },
        action: { actionType: "Trustline::Action", actionId: request.action },
        resource: { entityType: request.resource.type, entityId: request.resource.id },
        context: {
          contextMap: Object.fromEntries(Object.entries(request.context).map(([k, v]) => [k, toAttribute(v)])),
        },
        entities: { entityList },
      }),
    );

    const decision = res.decision === "ALLOW" ? "ALLOW" : "DENY";
    // AVP returns generated policy ids; scripts/upload-avp.sh prints the map back to our names.
    const names = policyNameMap();
    const determining = (res.determiningPolicies ?? []).map((p) => names[p.policyId ?? ""] ?? p.policyId ?? "unknown");
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
