import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  type QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { config } from "@/lib/config";
import {
  INDEXES,
  primaryKey,
  type CollectionName,
  type Collections,
  type DocumentStore,
} from "@/lib/data/store";

/**
 * Single-table DynamoDB design.
 *
 *   PK = <collection>          SK = <id>
 *   GSI1: gsi1pk = <collection>#<field1>=<value>, SK
 *   GSI2: gsi2pk = <collection>#<field2>=<value>, SK
 *
 * Holder secrets are already sealed with AES-256-GCM before they reach this
 * layer; the table itself should additionally use a customer-managed KMS key.
 */
export class DynamoDocumentStore implements DocumentStore {
  readonly kind = "dynamodb" as const;
  private client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: config.awsRegion }), {
    marshallOptions: { removeUndefinedValues: true },
  });

  constructor(private readonly table = config.dynamoTable) {}

  private item<K extends CollectionName>(collection: K, doc: Collections[K]) {
    const id = primaryKey(collection, doc);
    const item: Record<string, unknown> = { PK: collection, SK: id, doc };
    const [f1, f2] = INDEXES[collection] as string[];
    const v1 = f1 ? (doc as Record<string, unknown>)[f1] : undefined;
    const v2 = f2 ? (doc as Record<string, unknown>)[f2] : undefined;
    if (typeof v1 === "string") item.gsi1pk = `${collection}#${f1}=${v1}`;
    if (typeof v2 === "string") item.gsi2pk = `${collection}#${f2}=${v2}`;
    return item;
  }

  async get<K extends CollectionName>(collection: K, id: string) {
    const res = await this.client.send(new GetCommand({ TableName: this.table, Key: { PK: collection, SK: id } }));
    return (res.Item?.doc as Collections[K] | undefined) ?? null;
  }

  async put<K extends CollectionName>(collection: K, doc: Collections[K]) {
    await this.client.send(new PutCommand({ TableName: this.table, Item: this.item(collection, doc) }));
  }

  private async queryAll<K extends CollectionName>(input: QueryCommandInput) {
    const out: Collections[K][] = [];
    let ExclusiveStartKey: Record<string, unknown> | undefined;
    do {
      const res = await this.client.send(new QueryCommand({ ...input, ExclusiveStartKey }));
      for (const item of res.Items ?? []) out.push(item.doc as Collections[K]);
      ExclusiveStartKey = res.LastEvaluatedKey;
    } while (ExclusiveStartKey);
    return out;
  }

  async query<K extends CollectionName>(collection: K, field: keyof Collections[K] & string, value: string) {
    const fields = INDEXES[collection] as string[];
    const position = fields.indexOf(field);
    if (position < 0 || position > 1) throw new Error(`${collection}.${field} is not an indexed field`);
    const index = position === 0 ? "gsi1" : "gsi2";
    return this.queryAll<K>({
      TableName: this.table,
      IndexName: index,
      KeyConditionExpression: `${index}pk = :pk`,
      ExpressionAttributeValues: { ":pk": `${collection}#${field}=${value}` },
    });
  }

  async all<K extends CollectionName>(collection: K) {
    return this.queryAll<K>({
      TableName: this.table,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": collection },
    });
  }

  /** Clears demo collections. Never exposed when DEMO_MODE=false. */
  async clear() {
    const collections = Object.keys(INDEXES) as CollectionName[];
    for (const collection of collections) {
      const docs = await this.all(collection);
      for (let i = 0; i < docs.length; i += 25) {
        const chunk = docs.slice(i, i + 25);
        await this.client.send(
          new BatchWriteCommand({
            RequestItems: {
              [this.table]: chunk.map((doc) => ({
                DeleteRequest: { Key: { PK: collection, SK: primaryKey(collection, doc) } },
              })),
            },
          }),
        );
      }
    }
  }
}
