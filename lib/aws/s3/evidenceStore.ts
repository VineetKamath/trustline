import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { config } from "@/lib/config";
import { open, seal } from "@/lib/crypto/secretBox";

/**
 * Off-chain evidence (e.g. the behavioural feedback behind an outcome
 * credential). Evidence is sealed with AES-256-GCM before storage and, on S3,
 * additionally encrypted with SSE-KMS in a bucket with all public access
 * blocked. Only a reference ever reaches the credential metadata; nothing
 * reaches the ledger.
 */
export interface EvidenceStore {
  put(key: string, evidence: unknown): Promise<string>;
  get<T>(ref: string): Promise<T>;
}

class LocalEvidenceStore implements EvidenceStore {
  private dir = path.join(process.cwd(), config.dataDir, "evidence");

  async put(key: string, evidence: unknown) {
    await fs.mkdir(this.dir, { recursive: true });
    const file = `${key.replace(/[^A-Za-z0-9_-]/g, "_")}.sealed`;
    await fs.writeFile(path.join(this.dir, file), seal(evidence, `evidence:${key}`));
    return `local://evidence/${file}#${key}`;
  }

  async get<T>(ref: string) {
    const [location, key] = ref.replace("local://evidence/", "").split("#");
    const sealed = await fs.readFile(path.join(this.dir, location), "utf8");
    return open<T>(sealed, `evidence:${key}`);
  }
}

class S3EvidenceStore implements EvidenceStore {
  private client = new S3Client({ region: config.awsRegion });

  async put(key: string, evidence: unknown) {
    const objectKey = `evidence/${key}.sealed`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: config.s3Bucket,
        Key: objectKey,
        Body: seal(evidence, `evidence:${key}`),
        ContentType: "application/octet-stream",
        ServerSideEncryption: "aws:kms",
      }),
    );
    return `s3://${config.s3Bucket}/${objectKey}#${key}`;
  }

  async get<T>(ref: string) {
    const [location, key] = ref.replace(`s3://${config.s3Bucket}/`, "").split("#");
    const res = await this.client.send(new GetObjectCommand({ Bucket: config.s3Bucket, Key: location }));
    const body = await res.Body!.transformToString();
    return open<T>(body, `evidence:${key}`);
  }
}

export function createEvidenceStore(): EvidenceStore {
  return config.evidenceMode === "s3" ? new S3EvidenceStore() : new LocalEvidenceStore();
}
