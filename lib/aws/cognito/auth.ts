import "server-only";
import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { config } from "@/lib/config";

/**
 * Amazon Cognito is used only for application login. The verified `sub` is
 * mapped to an internal user id; it is never used as, or linked publicly to,
 * the holder's Trustline identity.
 */
let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

function idTokenVerifier() {
  if (!config.cognitoUserPoolId || !config.cognitoClientId) {
    throw new Error("COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID must be set when AUTH_MODE=cognito");
  }
  verifier ??= CognitoJwtVerifier.create({
    userPoolId: config.cognitoUserPoolId,
    clientId: config.cognitoClientId,
    tokenUse: "id",
  });
  return verifier;
}

export async function signInWithCognito(email: string, password: string) {
  const client = new CognitoIdentityProviderClient({ region: config.awsRegion });
  const res = await client.send(
    new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: config.cognitoClientId,
      AuthParameters: { USERNAME: email, PASSWORD: password },
    }),
  );
  const idToken = res.AuthenticationResult?.IdToken;
  if (!idToken) throw new Error("Additional authentication steps are required");
  const claims = await idTokenVerifier().verify(idToken);
  return { sub: claims.sub, givenName: (claims.given_name as string | undefined) ?? "Trustline user" };
}
