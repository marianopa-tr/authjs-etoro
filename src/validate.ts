import { createRemoteJWKSet, jwtVerify } from "jose";
import type { EToroProfile } from "./types.js";

const DEFAULT_JWKS_URL = "https://www.etoro.com/.well-known/jwks.json";
const EXPECTED_ISSUER = "https://www.etoro.com";
const DEFAULT_CLOCK_TOLERANCE = 120;

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJWKS(
  url: string = DEFAULT_JWKS_URL,
): ReturnType<typeof createRemoteJWKSet> {
  let cached = jwksCache.get(url);
  if (!cached) {
    cached = createRemoteJWKSet(new URL(url));
    jwksCache.set(url, cached);
  }
  return cached;
}

/**
 * Validate an eToro id_token via JWKS and return the decoded profile.
 *
 * Verifies the JWT signature against eToro's published JWKS,
 * checks `iss` and `aud` claims, and extracts the `sub` (eToro user ID).
 *
 * @param idToken - The raw JWT id_token string from eToro's token endpoint.
 * @param clientId - Your eToro OAuth client ID (used to verify the `aud` claim).
 * @param options - Optional overrides for clock tolerance, JWKS URL, and issuer.
 * @returns The decoded {@link EToroProfile} payload.
 * @throws If the token is invalid, expired, or has wrong issuer/audience.
 */
export async function validateIdToken(
  idToken: string,
  clientId: string,
  options?: { clockTolerance?: number; jwksUrl?: string; issuer?: string },
): Promise<EToroProfile> {
  if (!idToken) {
    throw new Error("authjs-etoro: id_token is missing or empty");
  }
  if (!clientId) {
    throw new Error(
      "authjs-etoro: clientId is required for token validation",
    );
  }

  const clockTolerance = options?.clockTolerance ?? DEFAULT_CLOCK_TOLERANCE;

  const { payload } = await jwtVerify(idToken, getJWKS(options?.jwksUrl), {
    issuer: options?.issuer ?? EXPECTED_ISSUER,
    audience: clientId,
    clockTolerance,
    algorithms: ["RS256"],
  });

  if (!payload.sub) {
    throw new Error("authjs-etoro: id_token is missing the 'sub' claim");
  }

  return payload as unknown as EToroProfile;
}

/** Reset the cached JWKS — for testing only. */
export function _resetCache(): void {
  jwksCache.clear();
}
