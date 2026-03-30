import type { OAuthConfig, OAuthUserConfig } from "@auth/core/providers";
import type { EToroProfile } from "./types.js";
import { validateIdToken } from "./validate.js";

export type { EToroProfile } from "./types.js";
export { validateIdToken, _resetCache } from "./validate.js";

/**
 * eToro SSO provider for Auth.js.
 *
 * @example
 * ```ts
 * import eToro from "authjs-etoro";
 *
 * export default {
 *   providers: [eToro({ clientId: "…", clientSecret: "…" })],
 * };
 * ```
 */
export default function eToro(
  options: OAuthUserConfig<EToroProfile>,
): OAuthConfig<EToroProfile> {
  return {
    id: "etoro",
    name: "eToro",
    type: "oidc",
    authorization: {
      url: "https://www.etoro.com/sso",
      params: { scope: "openid" },
    },
    token: {
      url: "https://www.etoro.com/api/sso/v1/token",
    },
    userinfo: {
      request: async ({
        tokens,
        provider,
      }: {
        tokens: Record<string, unknown>;
        provider: { clientId?: string };
      }) => {
        const idToken = tokens.id_token as string | undefined;
        if (!idToken) {
          throw new Error(
            "authjs-etoro: id_token is missing from token response",
          );
        }
        return validateIdToken(idToken, provider.clientId!);
      },
    },
    profile(profile) {
      const name =
        profile.name ??
        ([profile.given_name, profile.family_name]
          .filter(Boolean)
          .join(" ") ||
          null);
      return {
        id: profile.sub,
        name,
        email: profile.email ?? null,
        image: null,
      };
    },
    checks: ["pkce", "state"],
    options,
  };
}
