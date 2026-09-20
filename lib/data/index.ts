import path from "node:path";
import { DynamoDocumentStore } from "@/lib/aws/dynamodb/dynamoStore";
import { config } from "@/lib/config";
import { LocalDocumentStore } from "./localStore";
import type { DocumentStore } from "./store";

export type { DocumentStore } from "./store";
export { LocalDocumentStore };

export function createDocumentStore(): DocumentStore {
  if (config.dataMode === "dynamodb") return new DynamoDocumentStore();
  return new LocalDocumentStore(path.join(process.cwd(), config.dataDir, "store.json"));
}
