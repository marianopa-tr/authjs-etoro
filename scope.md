# authjs-etoro — Scope

## Vision
A TypeScript-native eToro SSO provider for Auth.js (next-auth v5 / @auth/core). Developers add "Login with eToro" to any Auth.js-powered app — Next.js, SvelteKit, Astro, SolidStart, Express — with a single import and two config values. Third in a suite of eToro auth libraries alongside `passport-etoro` and `better-auth-etoro`.

## Goals
- Publish `authjs-etoro` to npm as an `@auth/core`-compatible provider function
- Follows exactly the same shape as built-in Auth.js providers (GitHub, Google, etc.)
- Full OAuth 2.0 + PKCE (S256) — eToro requires it
- ID token validated via JWKS (eToro has no `/userinfo` endpoint — identity is `sub` from id_token)
- Token type: `oidc` (eToro returns an id_token)
- TypeScript-native with full type exports matching `@auth/core` conventions
- 100% test coverage (vitest + msw for JWKS mocking)
- README with Next.js App Router, SvelteKit, and Astro quickstarts
- Passes `npm pack --dry-run` cleanly

## Target Users
### Primary
TypeScript developers using Auth.js (next-auth v5 or @auth/core) who need "Login with eToro".

### Secondary
Teams migrating from older next-auth v4 custom provider configs.

## Platform
npm library (TypeScript, ESM + CJS dual build)

## Product Principles
- **Same shape as built-in providers** — `eToro(options)` returns an `OAuthConfig<EToroProfile>`, identical to how `GitHub()` or `Google()` work.
- **Zero config surface** — just `clientId` and `clientSecret`.
- **No runtime deps beyond @auth/core** — `jose` for JWKS is the only additional dep.
- **JWKS validation is mandatory** — the id_token sub claim is the only identity source; skipping validation is not an option.
- **Tested to 100%** — every branch covered.

## Scope (In)
1. `eToro(options)` — provider factory returning `OAuthConfig<EToroProfile>`
   - `type: 'oidc'`
   - `id: 'etoro'`, `name: 'eToro'`
   - `authorization`: `{ url: 'https://www.etoro.com/sso', params: { scope: 'openid' } }`
   - `token`: `{ url: 'https://www.etoro.com/api/sso/v1/token' }`
   - `userinfo`: custom `request` function that decodes + JWKS-validates the id_token and returns the profile
   - `profile(profile)`: maps `EToroProfile` → Auth.js `User` shape (`id`, `name`, `email`, `image`)
   - `checks: ['pkce', 'state']` — eToro requires PKCE S256
2. `EToroProfile` TypeScript interface (the decoded id_token payload shape)
3. Standalone `validateIdToken(idToken, clientId)` export for advanced use
4. Dual ESM + CJS build (tsup)
5. Vitest test suite: 100% branch coverage, JWKS mocked with msw
6. `package.json` with correct `exports` map, `files`, `engines`, `peerDependencies: { "@auth/core": ">=0.18.0" }`
7. README: install + Next.js App Router quickstart + SvelteKit quickstart + Astro quickstart + token lifetime table + security checklist

## UX Direction
Developer experience is the UX. Adding eToro login should take < 5 lines:
```ts
import eToro from 'authjs-etoro'
providers: [eToro({ clientId: '...', clientSecret: '...' })]
```
Callback URL to whitelist: `https://yourapp.com/api/auth/callback/etoro`

## Technology Preferences
- **TypeScript** (strict mode)
- **tsup** for dual ESM/CJS build
- **vitest** for testing
- **msw** for JWKS endpoint mocking
- **jose** for JWKS / JWT validation
- **@auth/core** as peer dependency (>=0.18.0)

## Data & Access
- eToro SSO endpoints:
  - Authorization: `https://www.etoro.com/sso`
  - Token: `https://www.etoro.com/api/sso/v1/token`
  - JWKS: `https://www.etoro.com/.well-known/jwks.json`
  - Expected `iss`: `https://www.etoro.com`
- No `/userinfo` endpoint — identity comes from id_token `sub` claim only

## Success Criteria
- `import eToro from 'authjs-etoro'` and `providers: [eToro({...})]` works in a Next.js Auth.js setup
- Auth.js callback URL is `/api/auth/callback/etoro`
- JWKS validation passes/fails correctly in tests
- `profile()` returns `{ id: sub, name: null, email: null, image: null }`
- All 100% coverage thresholds pass
- `npm pack --dry-run` shows only dist + README

## Non-Goals
- Not a standalone auth server
- Not a UI component
- No database — Auth.js handles adapters
- Not a replacement for passport-etoro or better-auth-etoro

## Deployment
**Target: npm registry**
