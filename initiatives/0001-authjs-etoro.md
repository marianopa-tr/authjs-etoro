---
id: authjs-etoro
title: "authjs-etoro — eToro SSO provider for Auth.js (@auth/core)"
parent: null
deps: []
split: null
depth: 0
planned: false
executed: false
---

## Overview

Build and publish `authjs-etoro` — a TypeScript-native eToro SSO provider for Auth.js (next-auth v5 / @auth/core).

Auth.js providers are functions that return an `OAuthConfig<Profile>` object. This package exports a default `eToro(options)` function matching exactly that shape — the same way built-in providers like GitHub and Google work. Drop it into `providers: [eToro({ clientId, clientSecret })]` and Auth.js handles the rest.

**The core challenge:** eToro has no `/userinfo` endpoint. User identity lives in the `sub` claim of the id_token returned at the token exchange step. The `userinfo` config must use a custom `request` function that:
1. Extracts `id_token` from the token response
2. Validates it via JWKS (`https://www.etoro.com/.well-known/jwks.json`)
3. Returns the decoded payload as the profile

**Key references:**
- Auth.js provider shape: `OAuthConfig<P>` from `@auth/core/providers`
- Built-in provider example: `@auth/core/providers/github` — follow this structure exactly
- JWKS validation: reuse the same pattern as `passport-etoro` and `better-auth-etoro` (both already in this workspace)
- Auth.js callback URL convention: `/api/auth/callback/etoro`
- Auth.js requires `checks: ['pkce', 'state']` for PKCE

## Acceptance Criteria

- [ ] Default export `eToro(options: OAuthUserConfig<EToroProfile>): OAuthConfig<EToroProfile>`
- [ ] `provider.id === 'etoro'`
- [ ] `provider.name === 'eToro'`
- [ ] `provider.type === 'oidc'`
- [ ] `provider.authorization` points to `https://www.etoro.com/sso` with `scope: 'openid'`
- [ ] `provider.token` points to `https://www.etoro.com/api/sso/v1/token`
- [ ] `provider.userinfo.request` validates the id_token via JWKS and returns profile
- [ ] `provider.profile(profile)` returns `{ id: profile.sub, name: profile.name ?? null, email: profile.email ?? null, image: null }`
- [ ] `provider.checks` includes `'pkce'` and `'state'`
- [ ] Named export `validateIdToken(idToken: string, clientId: string): Promise<EToroProfile>` for advanced use
- [ ] `EToroProfile` interface exported with at minimum: `sub`, `iss`, `aud`, `iat`, `exp`, optional `name`, `email`
- [ ] TypeScript strict mode, no type errors
- [ ] Dual ESM + CJS build via tsup with `.d.ts` / `.d.cts`
- [ ] `peerDependencies: { "@auth/core": ">=0.18.0" }`, `dependencies: { "jose": "^5.0.0" }`
- [ ] Vitest tests with msw JWKS mocking — 100% branch coverage:
  - `eToro()` returns correct shape
  - `userinfo.request` returns profile for valid id_token
  - `userinfo.request` returns null/throws for missing id_token
  - `userinfo.request` throws for invalid JWT signature
  - `profile()` mapping
  - `validateIdToken` valid/invalid/expired/wrong-iss/wrong-aud cases
  - JWKS cache hit (second call reuses cache)
  - `_resetCache()` works
- [ ] `package.json` has `files: ["dist", "README.md"]`, correct `exports` map
- [ ] `npm pack --dry-run` clean — no src, tests, coverage in tarball
- [ ] README: install, Next.js quickstart, SvelteKit quickstart, Astro quickstart, callback URL table, token lifetime table, security checklist
- [ ] `git add -A && git commit -m "0001: implement authjs-etoro"` after all passing
