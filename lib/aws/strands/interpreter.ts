import type { StructuredRequest } from "@/types";

export interface InterpretContext {
  verifierName: string;
}

/**
 * Turns a natural-language verification request into a structured request.
 *
 * The interpreter has no access to credentials, secrets or holder data and
 * makes no authorization decision: its output is validated and then sent to
 * Cedar, which is the only authority that can ALLOW or DENY.
 */
export interface RequestInterpreter {
  readonly engine: "local-deterministic" | "strands-bedrock";
  interpret(text: string, context: InterpretContext): Promise<StructuredRequest>;
}
