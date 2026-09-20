import path from "node:path";
import { config } from "@/lib/config";
import { FabricBlockchainAdapter } from "./fabricAdapter";
import type { BlockchainAdapter } from "./interface";
import { LocalBlockchainAdapter } from "./localAdapter";

export type { BlockchainAdapter } from "./interface";
export { LocalBlockchainAdapter, FabricBlockchainAdapter };

export function createBlockchainAdapter(): BlockchainAdapter {
  if (config.blockchainMode === "fabric") return new FabricBlockchainAdapter();
  return new LocalBlockchainAdapter(path.join(process.cwd(), config.dataDir, "ledger.json"));
}
