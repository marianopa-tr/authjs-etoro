# authjs-etoro

eToro SSO provider for [Auth.js](https://authjs.dev) (next-auth v5 / @auth/core). Add "Login with eToro" to any Auth.js-powered app with a single import and two config values.

```ts
import eToro from "authjs-etoro";

export default {
  providers: [eToro({ clientId: "…", clientSecret: "…" })],
};
```

Works with Next.js, SvelteKit, Astro, SolidStart, Express — anywhere Auth.js runs.

## Install

```bash
npm install authjs-etoro
```

Peer dependency: `@auth/core >= 0.18.0` (installed automatically with `next-auth@5` or any Auth.js framework adapter).

## Quick Start

### Next.js (App Router)

```ts
// auth.ts
import NextAuth from "next-auth";
import eToro from "authjs-etoro";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    eToro({
      clientId: process.env.ETORO_CLIENT_ID!,
      clientSecret: process.env.ETORO_CLIENT_SECRET!,
    }),
  ],
});
```

```ts
// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
```

### SvelteKit

```ts
// src/hooks.server.ts
import { SvelteKitAuth } from "@auth/sveltekit";
import eToro from "authjs-etoro";

export const { handle } = SvelteKitAuth({
  providers: [
    eToro({
      clientId: import.meta.env.ETORO_CLIENT_ID,
      clientSecret: import.meta.env.ETORO_CLIENT_SECRET,
    }),
  ],
});
```

### Astro

```ts
// auth.config.ts
import eToro from "authjs-etoro";
import { defineConfig } from "auth-astro";

export default defineConfig({
  providers: [
    eToro({
      clientId: import.meta.env.ETORO_CLIENT_ID,
      clientSecret: import.meta.env.ETORO_CLIENT_SECRET,
    }),
  ],
});
```

## Callback URL

Register this callback URL with your eToro application:

| Framework | Callback URL |
|-----------|-------------|
| Next.js | `https://yourapp.com/api/auth/callback/etoro` |
| SvelteKit | `https://yourapp.com/auth/callback/etoro` |
| Astro | `https://yourapp.com/api/auth/callback/etoro` |

The provider ID is `etoro` (lowercase).

## Token Lifetimes

| Token | Lifetime | Notes |
|-------|----------|-------|
| Access token | 10 minutes | Short-lived |
| Refresh token | 30 days | Rotating — each use returns a new refresh token |
| ID token | 10 minutes | Used for identity only; validated via JWKS |

## How It Works

eToro has no `/userinfo` endpoint. User identity comes from the `sub` claim of the `id_token` returned at the OAuth token exchange step. This provider:

1. Redirects the user to `https://www.etoro.com/sso` with PKCE (S256)
2. Exchanges the authorization code at `https://www.etoro.com/api/sso/v1/token`
3. Validates the `id_token` via JWKS (`https://www.etoro.com/.well-known/jwks.json`)
4. Extracts the user profile from the decoded JWT payload

## Exports

### Default export: `eToro(options)`

Returns an `OAuthConfig<EToroProfile>` compatible with Auth.js.

```ts
import eToro from "authjs-etoro";
```

### Named exports

```ts
import { validateIdToken, _resetCache, type EToroProfile } from "authjs-etoro";
```

- **`validateIdToken(idToken, clientId, options?)`** — Standalone JWKS-validated id_token decoder. Useful for custom flows outside Auth.js.
- **`_resetCache()`** — Clears the internal JWKS cache. For testing only.
- **`EToroProfile`** — TypeScript interface for the decoded id_token payload.

#### `validateIdToken` options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `clockTolerance` | `number` | `120` | Seconds of tolerance for token expiration checks |
| `jwksUrl` | `string` | `https://www.etoro.com/.well-known/jwks.json` | JWKS endpoint URL |
| `issuer` | `string` | `https://www.etoro.com` | Expected `iss` claim value |

```ts
import { validateIdToken } from "authjs-etoro";

const profile = await validateIdToken(idToken, clientId, {
  jwksUrl: "https://staging.etoro.com/.well-known/jwks.json",
  issuer: "https://staging.etoro.com",
  clockTolerance: 300,
});
```

### `EToroProfile` shape

```ts
interface EToroProfile {
  sub: string;        // eToro user ID
  iss: string;        // "https://www.etoro.com"
  aud: string;        // Your client ID
  iat: number;        // Issued at (Unix timestamp)
  exp: number;        // Expires at (Unix timestamp)
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  email_verified?: boolean;
}
```

## Security Checklist

- [x] **PKCE (S256)** — Required by eToro, enforced via `checks: ["pkce", "state"]`
- [x] **JWKS validation** — Every id_token is verified against eToro's published JSON Web Key Set
- [x] **Issuer verification** — Tokens must have `iss: "https://www.etoro.com"`
- [x] **Audience verification** — Tokens must have `aud` matching your client ID
- [x] **Algorithm restriction** — Only RS256 tokens accepted
- [x] **Clock tolerance** — 120-second tolerance for token expiration checks
- [x] **No `/userinfo` dependency** — Identity extracted directly from the cryptographically verified id_token
- [ ] **HTTPS only** — Always serve your callback URL over HTTPS in production
- [ ] **Secret storage** — Keep `clientSecret` in environment variables, never in source code
- [ ] **Token storage** — Use Auth.js database adapters to persist sessions securely

## Related Packages

- [`passport-etoro`](https://github.com/marianopa-tr/passport-etoro) — eToro strategy for Passport.js
- [`better-auth-etoro`](https://github.com/marianopa-tr/better-auth-etoro) — eToro plugin for Better Auth

## License

MIT
