import { config } from "@/lib/config";
import type { StructuredRequest } from "@/types";
import type { InterpretContext, RequestInterpreter } from "./interpreter";
import { LocalRequestInterpreter } from "./localInterpreter";
import { StrandsRequestInterpreter } from "./remoteInterpreter";

export type { RequestInterpreter } from "./interpreter";

/**
 * In Strands mode, falls back to the deterministic interpreter if the agent
 * is unavailable, and reports which engine produced the interpretation.
 */
class ResilientInterpreter {
  private local = new LocalRequestInterpreter();
  private remote = config.agentMode === "strands" ? new StrandsRequestInterpreter() : null;

  async interpret(
    text: string,
    context: InterpretContext,
  ): Promise<{ structured: StructuredRequest; engine: RequestInterpreter["engine"] }> {
    if (this.remote) {
      try {
        return { structured: await this.remote.interpret(text, context), engine: this.remote.engine };
      } catch (error) {
        console.warn("[trustline] Strands agent unavailable, using local interpreter:", (error as Error).message);
      }
    }
    return { structured: await this.local.interpret(text, context), engine: this.local.engine };
  }
}

export function createInterpreter() {
  return new ResilientInterpreter();
}
