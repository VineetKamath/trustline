import type {
  ActivityRecord,
  BookingRecord,
  CredentialMetadata,
  Interpretation,
  OrganizationRecord,
  UserRecord,
  VerificationRequestRecord,
  VerificationResultRecord,
  WalletEntry,
} from "@/types";

/** Every collection and the document type it holds. */
export interface Collections {
  users: UserRecord;
  organizations: OrganizationRecord;
  credentials: CredentialMetadata;
  wallet: WalletEntry;
  interpretations: Interpretation;
  verificationRequests: VerificationRequestRecord;
  verificationResults: VerificationResultRecord;
  bookings: BookingRecord;
  activity: ActivityRecord;
  meta: { id: string; value: string };
}

export type CollectionName = keyof Collections;

/**
 * Secondary indexes. The DynamoDB adapter maps the first two fields of each
 * collection onto GSI1 / GSI2 of a single table.
 */
export const INDEXES: { [K in CollectionName]: (keyof Collections[K] & string)[] } = {
  users: ["trustlineId", "cognitoSub"],
  organizations: [],
  credentials: ["holderUserId", "issuerId"],
  wallet: ["userId", "credentialId"],
  interpretations: ["orgId"],
  verificationRequests: ["subjectUserId", "verifierId"],
  verificationResults: ["subjectUserId", "verifierId"],
  bookings: ["guestUserId", "hostUserId"],
  activity: ["ownerId"],
  meta: [],
};

export function primaryKey<K extends CollectionName>(collection: K, doc: Collections[K]): string {
  switch (collection) {
    case "credentials":
      return (doc as CredentialMetadata).credentialId;
    default:
      return (doc as { id: string }).id;
  }
}

export interface DocumentStore {
  readonly kind: "local" | "dynamodb";
  get<K extends CollectionName>(collection: K, id: string): Promise<Collections[K] | null>;
  put<K extends CollectionName>(collection: K, doc: Collections[K]): Promise<void>;
  /** Equality lookup on an indexed field. */
  query<K extends CollectionName>(
    collection: K,
    field: keyof Collections[K] & string,
    value: string,
  ): Promise<Collections[K][]>;
  all<K extends CollectionName>(collection: K): Promise<Collections[K][]>;
  clear(): Promise<void>;
}
