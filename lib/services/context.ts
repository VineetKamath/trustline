import "server-only";
import { createInterpreter } from "@/lib/aws/strands";
import { createPolicyEngine, type PolicyEngine } from "@/lib/aws/cedar";
import { createEvidenceStore, type EvidenceStore } from "@/lib/aws/s3/evidenceStore";
import { createBlockchainAdapter, type BlockchainAdapter } from "@/lib/blockchain";
import { assertProductionSecrets } from "@/lib/config";
import { createDocumentStore, type DocumentStore } from "@/lib/data";

export interface Services {
  store: DocumentStore;
  chain: BlockchainAdapter;
  policy: PolicyEngine;
  interpreter: ReturnType<typeof createInterpreter>;
  evidence: EvidenceStore;
}

type Holder = { services?: Services; ready?: Promise<void> };
const g = globalThis as unknown as { __trustline?: Holder };
const holder: Holder = (g.__trustline ??= {});

function build(): Services {
  assertProductionSecrets();
  return {
    store: createDocumentStore(),
    chain: createBlockchainAdapter(),
    policy: createPolicyEngine(),
    interpreter: createInterpreter(),
    evidence: createEvidenceStore(),
  };
}

/**
 * Returns the process-wide service container, seeding the demo dataset on
 * first use when DEMO_MODE=true. Kept on globalThis so dev hot reloads reuse it.
 */
export async function getServices(): Promise<Services> {
  if (!holder.services) holder.services = build();
  if (!holder.ready) {
    const { ensureSeeded } = await import("@/lib/demo/seed");
    holder.ready = ensureSeeded(holder.services).catch((error) => {
      holder.ready = undefined;
      throw error;
    });
  }
  await holder.ready;
  return holder.services;
}

/** Raw access without seeding — used by the seeder itself. */
export function rawServices(): Services {
  if (!holder.services) holder.services = build();
  return holder.services;
}

/**
 * Demo reset: recreates every adapter (so dev hot-reloads pick up new code),
 * wipes data and reseeds. Other requests wait on the same promise.
 */
export async function resetDemo(): Promise<void> {
  const services = build();
  holder.services = services;
  holder.ready = (async () => {
    const { resetAndSeed } = await import("@/lib/demo/seed");
    await resetAndSeed(services);
  })();
  try {
    await holder.ready;
  } catch (error) {
    holder.ready = undefined;
    throw error;
  }
}
