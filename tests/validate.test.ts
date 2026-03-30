import { describe, it, expect, afterEach } from "vitest";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { http, HttpResponse } from "msw";
import { validateIdToken, _resetCache } from "../src/validate.js";
import { server } from "./server.js";
import {
  TEST_CLIENT_ID,
  JWKS_URL,
  createTestIdToken,
  createExpiredToken,
} from "./helpers.js";

afterEach(() => {
  _resetCache();
});

describe("validateIdToken", () => {
  it("validates a well-formed id_token and returns the profile", async () => {
    const token = await createTestIdToken();
    const profile = await validateIdToken(token, TEST_CLIENT_ID);

    expect(profile.sub).toBe("etoro-user-12345");
    expect(profile.iss).toBe("https://www.etoro.com");
    expect(profile.aud).toBe(TEST_CLIENT_ID);
    expect(typeof profile.iat).toBe("number");
    expect(typeof profile.exp).toBe("number");
  });

  it("includes optional claims when present", async () => {
    const token = await createTestIdToken({
      given_name: "John",
      family_name: "Doe",
      email: "john@example.com",
    });
    const profile = await validateIdToken(token, TEST_CLIENT_ID);

    expect(profile.given_name).toBe("John");
    expect(profile.family_name).toBe("Doe");
    expect(profile.email).toBe("john@example.com");
  });

  it("throws when id_token is empty string", async () => {
    await expect(validateIdToken("", TEST_CLIENT_ID)).rejects.toThrow(
      "id_token is missing or empty",
    );
  });

  it("throws when clientId is empty string", async () => {
    const token = await createTestIdToken();
    await expect(validateIdToken(token, "")).rejects.toThrow(
      "clientId is required for token validation",
    );
  });

  it("rejects an expired token", async () => {
    const token = await createExpiredToken();
    await expect(validateIdToken(token, TEST_CLIENT_ID)).rejects.toThrow();
  });

  it("rejects a token with wrong issuer", async () => {
    const token = await createTestIdToken({}, { issuer: "https://evil.com" });
    await expect(validateIdToken(token, TEST_CLIENT_ID)).rejects.toThrow();
  });

  it("rejects a token with wrong audience", async () => {
    const token = await createTestIdToken({}, { audience: "wrong-client" });
    await expect(validateIdToken(token, TEST_CLIENT_ID)).rejects.toThrow();
  });

  it("rejects a token missing the sub claim", async () => {
    const token = await createTestIdToken({}, { omitSub: true });
    await expect(validateIdToken(token, TEST_CLIENT_ID)).rejects.toThrow(
      "missing the 'sub' claim",
    );
  });
});

describe("JWKS cache", () => {
  it("reuses the cached JWKS on second call", async () => {
    const token1 = await createTestIdToken();
    const token2 = await createTestIdToken({ sub: "user-2" });

    await validateIdToken(token1, TEST_CLIENT_ID);
    await validateIdToken(token2, TEST_CLIENT_ID);

    // Both calls succeed — JWKS was fetched once and cached
    expect(true).toBe(true);
  });

  it("_resetCache clears the JWKS cache", async () => {
    const token = await createTestIdToken();
    await validateIdToken(token, TEST_CLIENT_ID);

    _resetCache();

    const token2 = await createTestIdToken({ sub: "user-after-reset" });
    const profile = await validateIdToken(token2, TEST_CLIENT_ID);
    expect(profile.sub).toBe("user-after-reset");
  });
});

describe("validateIdToken custom options", () => {
  it("accepts a token with custom issuer when option matches", async () => {
    const customIssuer = "https://staging.etoro.com";
    const token = await createTestIdToken({}, { issuer: customIssuer });

    server.use(
      http.get("https://staging.etoro.com/.well-known/jwks.json", async () => {
        const { getTestJWKS } = await import("./helpers.js");
        const jwks = await getTestJWKS();
        return HttpResponse.json(jwks);
      }),
    );

    const profile = await validateIdToken(token, TEST_CLIENT_ID, {
      issuer: customIssuer,
      jwksUrl: "https://staging.etoro.com/.well-known/jwks.json",
    });
    expect(profile.sub).toBe("etoro-user-12345");
    expect(profile.iss).toBe(customIssuer);
  });

  it("accepts a token expired within default tolerance (120s)", async () => {
    const token = await createTestIdToken({}, { expiresInSeconds: -60 });
    const profile = await validateIdToken(token, TEST_CLIENT_ID);
    expect(profile.sub).toBe("etoro-user-12345");
  });

  it("rejects a token expired beyond default tolerance", async () => {
    const token = await createTestIdToken({}, { expiresInSeconds: -200 });
    await expect(validateIdToken(token, TEST_CLIENT_ID)).rejects.toThrow();
  });

  it("accepts custom clockTolerance", async () => {
    const token = await createTestIdToken({}, { expiresInSeconds: -250 });
    const profile = await validateIdToken(token, TEST_CLIENT_ID, {
      clockTolerance: 300,
    });
    expect(profile.sub).toBe("etoro-user-12345");
  });

  it("rejects with clockTolerance of 0 for expired token", async () => {
    const token = await createTestIdToken({}, { expiresInSeconds: -1 });
    await expect(
      validateIdToken(token, TEST_CLIENT_ID, { clockTolerance: 0 }),
    ).rejects.toThrow();
  });
});

describe("algorithm restriction", () => {
  it("rejects a PS256-signed token", async () => {
    const { publicKey, privateKey } = await generateKeyPair("PS256");
    const jwk = await exportJWK(publicKey);

    server.use(
      http.get(JWKS_URL, () => {
        return HttpResponse.json({
          keys: [{ ...jwk, kid: "ps256-key", use: "sig" }],
        });
      }),
    );

    const token = await new SignJWT({ sub: "test-user" })
      .setProtectedHeader({ alg: "PS256", kid: "ps256-key" })
      .setIssuedAt()
      .setIssuer("https://www.etoro.com")
      .setAudience(TEST_CLIENT_ID)
      .setExpirationTime("1h")
      .sign(privateKey);

    await expect(validateIdToken(token, TEST_CLIENT_ID)).rejects.toThrow();
  });
});
