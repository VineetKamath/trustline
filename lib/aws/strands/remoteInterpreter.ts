import { config } from "@/lib/config";
import { structuredRequestSchema } from "@/lib/validation/schemas";
import type { StructuredRequest } from "@/types";
import type { InterpretContext, RequestInterpreter } from "./interpreter";

/**
 * Calls the Strands agent service (services/strands-agent), which runs a
 * Strands Agents SDK agent on Amazon Bedrock behind API Gateway + Lambda.
 * The agent's output is untrusted: it is schema-validated here and then
 * authorized by Cedar like any other request.
 */
export class StrandsRequestInterpreter implements RequestInterpreter {
  readonly engine = "strands-bedrock" as const;

  async interpret(text: string, context: InterpretContext): Promise<StructuredRequest> {
    if (!config.strandsAgentUrl) throw new Error("STRANDS_AGENT_URL is not configured");
    const res = await fetch(config.strandsAgentUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.STRANDS_AGENT_TOKEN ? { authorization: `Bearer ${process.env.STRANDS_AGENT_TOKEN}` } : {}),
      },
      body: JSON.stringify({ text, verifier: context.verifierName }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`Strands agent returned ${res.status}`);
    const parsed = structuredRequestSchema.safeParse(await res.json());
    if (!parsed.success) throw new Error("Strands agent returned an invalid structured request");
    return parsed.data as StructuredRequest;
  }
}
