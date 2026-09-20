/**
 * Server-side configuration. Every value has a safe local default so that
 * `npm run dev` works with no AWS account and no blockchain network.
 */
function flag(value: string | undefined, fallback: boolean) {
  if (value === undefined || value === "") return fallback;
  return value === "true" || value === "1";
}

const DEV_SECRET = "trustline-local-development-only";

export const config = {
  demoMode: flag(process.env.DEMO_MODE, true),
  blockchainMode: (process.env.BLOCKCHAIN_MODE ?? "local") as "local" | "fabric",
  dataMode: (process.env.DATA_MODE ?? "local") as "local" | "dynamodb",
  policyMode: (process.env.POLICY_MODE ?? "local") as "local" | "avp",
  agentMode: (process.env.AGENT_MODE ?? "local") as "local" | "strands",
  authMode: (process.env.AUTH_MODE ?? "demo") as "demo" | "cognito",
  evidenceMode: (process.env.EVIDENCE_MODE ?? "local") as "local" | "s3",

  awsRegion: process.env.AWS_REGION ?? "ap-south-1",
  cognitoUserPoolId: process.env.COGNITO_USER_POOL_ID ?? "",
  cognitoClientId: process.env.COGNITO_CLIENT_ID ?? "",
  dynamoTable: process.env.DYNAMODB_TABLE ?? "trustline",
  s3Bucket: process.env.S3_BUCKET ?? "",
  policyStoreId: process.env.VERIFIED_PERMISSIONS_POLICY_STORE ?? "",
  bedrockModelId: process.env.BEDROCK_MODEL_ID ?? "",
  strandsAgentUrl: process.env.STRANDS_AGENT_URL ?? "",

  fabric: {
    peerEndpoint: process.env.FABRIC_PEER_ENDPOINT ?? "",
    peerHostAlias: process.env.FABRIC_PEER_HOST_ALIAS ?? "",
    tlsCertPath: process.env.FABRIC_TLS_CERT_PATH ?? "",
    mspId: process.env.FABRIC_MSP_ID ?? "",
    certPath: process.env.FABRIC_CERT_PATH ?? "",
    keyPath: process.env.FABRIC_KEY_PATH ?? "",
    channel: process.env.FABRIC_CHANNEL ?? "trustline",
    chaincode: process.env.FABRIC_CHAINCODE ?? "trustline",
  },

  sessionSecret: process.env.SESSION_SECRET || DEV_SECRET,
  walletEncryptionKey: process.env.WALLET_ENCRYPTION_KEY || DEV_SECRET,
  dataDir: process.env.TRUSTLINE_DATA_DIR ?? ".data",
};

export function assertProductionSecrets() {
  if (!config.demoMode && (config.sessionSecret === DEV_SECRET || config.walletEncryptionKey === DEV_SECRET)) {
    throw new Error("SESSION_SECRET and WALLET_ENCRYPTION_KEY must be set when DEMO_MODE=false");
  }
}
