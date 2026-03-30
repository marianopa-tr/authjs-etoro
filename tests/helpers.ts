import { exportJWK, generateKeyPair, SignJWT } from "jose";

export const TEST_CLIENT_ID = "test-client-id";
export const ISSUER = "https://www.etoro.com";
export const JWKS_URL = "https://www.etoro.com/.well-known/jwks.json";

const TEST_KID = "test-key-1";

let cachedKeyPair: { publicKey: CryptoKey; privateKey: CryptoKey } | null =
  null;

export async function getTestKeyPair() {
  if (!cachedKeyPair) {
    cachedKeyPair = await generateKeyPair("RS256");
  }
  return cachedKeyPair;
}

export async function getTestJWKS() {
  const { publicKey } = await getTestKeyPair();
  const jwk = await exportJWK(publicKey);
  return { keys: [{ ...jwk, kid: TEST_KID, alg: "RS256", use: "sig" }] };
}

export async function createTestIdToken(
  claims: Record<string, unknown> = {},
  options: {
    expiresIn?: string;
    expiresInSeconds?: number;
    issuer?: string;
    audience?: string;
    omitSub?: boolean;
  } = {},
) {
  const { privateKey } = await getTestKeyPair();
  const payload: Record<string, unknown> = {};

  if (!options.omitSub) {
    payload.sub = claims.sub ?? "etoro-user-12345";
  }
  const { sub: _sub, ...restClaims } = claims;
  Object.assign(payload, restClaims);

  const now = Math.floor(Date.now() / 1000);
  const builder = new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "RS256", kid: TEST_KID })
    .setIssuedAt()
    .setIssuer(options.issuer ?? ISSUER)
    .setAudience(options.audience ?? TEST_CLIENT_ID);

  if (options.expiresInSeconds !== undefined) {
    builder.setExpirationTime(now + options.expiresInSeconds);
  } else {
    builder.setExpirationTime(options.expiresIn ?? "1h");
  }

  return builder.sign(privateKey);
}

export async function createExpiredToken(
  claims: Record<string, unknown> = {},
) {
  const { privateKey } = await getTestKeyPair();
  const past = Math.floor(Date.now() / 1000) - 3600;
  return new SignJWT({ sub: "etoro-user-12345", ...claims })
    .setProtectedHeader({ alg: "RS256", kid: TEST_KID })
    .setIssuedAt(past - 3600)
    .setExpirationTime(past)
    .setIssuer(ISSUER)
    .setAudience(TEST_CLIENT_ID)
    .sign(privateKey);
}
