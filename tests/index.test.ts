import { describe, it, expect, afterEach } from "vitest";
import eToro, {
  validateIdToken,
  _resetCache,
  type EToroProfile,
} from "../src/index.js";
import { TEST_CLIENT_ID, createTestIdToken } from "./helpers.js";

afterEach(() => {
  _resetCache();
});

describe("eToro provider factory", () => {
  const provider = eToro({
    clientId: TEST_CLIENT_ID,
    clientSecret: "test-secret",
  });

  it("has id 'etoro'", () => {
    expect(provider.id).toBe("etoro");
  });

  it("has name 'eToro'", () => {
    expect(provider.name).toBe("eToro");
  });

  it("has type 'oidc'", () => {
    expect(provider.type).toBe("oidc");
  });

  it("has correct authorization URL with openid scope", () => {
    const auth = provider.authorization as {
      url: string;
      params: { scope: string };
    };
    expect(auth.url).toBe("https://www.etoro.com/sso");
    expect(auth.params.scope).toBe("openid");
  });

  it("has correct token URL", () => {
    const token = provider.token as { url: string };
    expect(token.url).toBe("https://www.etoro.com/api/sso/v1/token");
  });

  it("has pkce and state checks", () => {
    expect(provider.checks).toContain("pkce");
    expect(provider.checks).toContain("state");
  });

  it("has style with eToro branding", () => {
    const style = provider.style as {
      bg: string;
      text: string;
      brandColor: string;
    };
    expect(style).toBeDefined();
    expect(style.bg).toBe("#6ca843");
    expect(style.text).toBe("#fff");
    expect(style.brandColor).toBe("#6ca843");
  });

  it("has userinfo.request function", () => {
    const userinfo = provider.userinfo as {
      request: (...args: unknown[]) => unknown;
    };
    expect(typeof userinfo.request).toBe("function");
  });

  it("has profile function", () => {
    expect(typeof provider.profile).toBe("function");
  });
});

describe("userinfo.request", () => {
  it("returns profile for valid id_token", async () => {
    const provider = eToro({
      clientId: TEST_CLIENT_ID,
      clientSecret: "test-secret",
    });
    const request = (
      provider.userinfo as {
        request: (ctx: {
          tokens: Record<string, unknown>;
          provider: { clientId: string };
        }) => Promise<EToroProfile>;
      }
    ).request;

    const token = await createTestIdToken({
      given_name: "Jane",
      email: "jane@example.com",
    });
    const profile = await request({
      tokens: { id_token: token },
      provider: { clientId: TEST_CLIENT_ID },
    });

    expect(profile.sub).toBe("etoro-user-12345");
    expect(profile.given_name).toBe("Jane");
    expect(profile.email).toBe("jane@example.com");
  });

  it("throws when id_token is missing from tokens", async () => {
    const provider = eToro({
      clientId: TEST_CLIENT_ID,
      clientSecret: "test-secret",
    });
    const request = (
      provider.userinfo as {
        request: (ctx: {
          tokens: Record<string, unknown>;
          provider: { clientId: string };
        }) => Promise<EToroProfile>;
      }
    ).request;

    await expect(
      request({
        tokens: {},
        provider: { clientId: TEST_CLIENT_ID },
      }),
    ).rejects.toThrow("id_token is missing from token response");
  });
});

describe("profile mapping", () => {
  const provider = eToro({
    clientId: TEST_CLIENT_ID,
    clientSecret: "test-secret",
  });

  it("maps sub to id", () => {
    const user = provider.profile!({
      sub: "user-123",
      iss: "https://www.etoro.com",
      aud: TEST_CLIENT_ID,
      iat: 0,
      exp: 0,
    } as EToroProfile);

    expect(user).toEqual({
      id: "user-123",
      name: null,
      email: null,
      image: null,
    });
  });

  it("maps name when present", () => {
    const user = provider.profile!({
      sub: "user-123",
      iss: "https://www.etoro.com",
      aud: TEST_CLIENT_ID,
      iat: 0,
      exp: 0,
      name: "John Doe",
    } as EToroProfile);

    expect(user).toEqual({
      id: "user-123",
      name: "John Doe",
      email: null,
      image: null,
    });
  });

  it("combines given_name and family_name when name is absent", () => {
    const user = provider.profile!({
      sub: "user-123",
      iss: "https://www.etoro.com",
      aud: TEST_CLIENT_ID,
      iat: 0,
      exp: 0,
      given_name: "Jane",
      family_name: "Smith",
    } as EToroProfile);

    expect(user).toEqual({
      id: "user-123",
      name: "Jane Smith",
      email: null,
      image: null,
    });
  });

  it("uses only given_name when family_name is absent", () => {
    const user = provider.profile!({
      sub: "user-123",
      iss: "https://www.etoro.com",
      aud: TEST_CLIENT_ID,
      iat: 0,
      exp: 0,
      given_name: "Jane",
    } as EToroProfile);

    expect(user).toEqual({
      id: "user-123",
      name: "Jane",
      email: null,
      image: null,
    });
  });

  it("maps email when present", () => {
    const user = provider.profile!({
      sub: "user-123",
      iss: "https://www.etoro.com",
      aud: TEST_CLIENT_ID,
      iat: 0,
      exp: 0,
      email: "test@example.com",
    } as EToroProfile);

    expect(user).toEqual({
      id: "user-123",
      name: null,
      email: "test@example.com",
      image: null,
    });
  });

  it("always returns image as null", () => {
    const user = provider.profile!({
      sub: "user-123",
      iss: "https://www.etoro.com",
      aud: TEST_CLIENT_ID,
      iat: 0,
      exp: 0,
      name: "Test",
      email: "a@b.c",
    } as EToroProfile);

    expect(user.image).toBeNull();
  });
});

describe("re-exports", () => {
  it("exports validateIdToken", () => {
    expect(typeof validateIdToken).toBe("function");
  });

  it("exports _resetCache", () => {
    expect(typeof _resetCache).toBe("function");
  });

  it("validateIdToken works directly", async () => {
    const token = await createTestIdToken();
    const profile = await validateIdToken(token, TEST_CLIENT_ID);
    expect(profile.sub).toBe("etoro-user-12345");
  });
});
