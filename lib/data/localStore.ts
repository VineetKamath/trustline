import fs from "node:fs";
import path from "node:path";
import { INDEXES, primaryKey, type CollectionName, type Collections, type DocumentStore } from "./store";

type Data = { [K in CollectionName]?: Record<string, Collections[K]> };

/**
 * File-backed document store for local development. Writes are atomic
 * (write-then-rename) and the whole dataset is kept in memory.
 */
export class LocalDocumentStore implements DocumentStore {
  readonly kind = "local" as const;
  private data: Data;

  constructor(private readonly filePath: string | null) {
    this.data = this.load();
  }

  private load(): Data {
    if (this.filePath && fs.existsSync(this.filePath)) {
      try {
        return JSON.parse(fs.readFileSync(this.filePath, "utf8")) as Data;
      } catch {
        return {};
      }
    }
    return {};
  }

  private persist() {
    if (!this.filePath) return;
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data));
    fs.renameSync(tmp, this.filePath);
  }

  private bucket<K extends CollectionName>(collection: K): Record<string, Collections[K]> {
    const existing = this.data[collection] as Record<string, Collections[K]> | undefined;
    if (existing) return existing;
    const created: Record<string, Collections[K]> = {};
    (this.data as Record<string, unknown>)[collection] = created;
    return created;
  }

  async get<K extends CollectionName>(collection: K, id: string) {
    const doc = this.bucket(collection)[id];
    return doc ? structuredClone(doc) : null;
  }

  async put<K extends CollectionName>(collection: K, doc: Collections[K]) {
    this.bucket(collection)[primaryKey(collection, doc)] = structuredClone(doc);
    this.persist();
  }

  async query<K extends CollectionName>(collection: K, field: keyof Collections[K] & string, value: string) {
    if (!(INDEXES[collection] as string[]).includes(field)) {
      throw new Error(`${collection}.${field} is not an indexed field`);
    }
    return Object.values(this.bucket(collection))
      .filter((doc) => (doc as Record<string, unknown>)[field] === value)
      .map((doc) => structuredClone(doc));
  }

  async all<K extends CollectionName>(collection: K) {
    return Object.values(this.bucket(collection)).map((doc) => structuredClone(doc));
  }

  async clear() {
    this.data = {};
    this.persist();
  }
}
