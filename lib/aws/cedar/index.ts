import { config } from "@/lib/config";
import { VerifiedPermissionsEngine } from "./avpEngine";
import type { PolicyEngine } from "./engine";
import { LocalCedarEngine } from "./localEngine";

export * from "./engine";
export { LocalCedarEngine, VerifiedPermissionsEngine };

export function createPolicyEngine(): PolicyEngine {
  return config.policyMode === "avp" ? new VerifiedPermissionsEngine() : new LocalCedarEngine();
}
