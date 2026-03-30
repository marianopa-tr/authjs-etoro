# Constraints

## Build
- Use `tsup` for dual ESM/CJS output
- Use `vitest` for testing (not Jest)
- Use `msw` v2 for JWKS endpoint mocking in tests
- Use `jose` for JWKS/JWT validation — same approach as passport-etoro and better-auth-etoro
- Strict TypeScript — `"strict": true` in tsconfig

## Package
- `@auth/core` must be a **peer dependency** only — never a direct dependency
- `jose` is the only hard runtime dependency
- Test files, src, coverage must NOT appear in the npm tarball
- `engines: { "node": ">=18.0.0" }`

## Auth.js provider contract
- The default export must be a function: `eToro(options) => OAuthConfig<EToroProfile>`
- Import types from `@auth/core/providers` — specifically `OAuthConfig` and `OAuthUserConfig`
- `type` field must be `'oidc'` (not `'oauth'`) because eToro returns an id_token
- `checks` must include `'pkce'` — eToro requires PKCE S256
- Auth.js callback URL: `/api/auth/callback/etoro` (lowercase provider id)

## eToro SSO facts
- **No `/userinfo` endpoint** — identity MUST come from id_token `sub` claim only
- JWKS URL: `https://www.etoro.com/.well-known/jwks.json`
- Expected issuer: `https://www.etoro.com`
- Authorization: `https://www.etoro.com/sso`
- Token: `https://www.etoro.com/api/sso/v1/token`
- Access token lifetime: 10 minutes
- Refresh token lifetime: 30 days (rotating)

## Quality
- 100% branch coverage required before marking executed
- All tests must pass in CI (no network calls — mock everything)
- Do NOT run `git push` — the build loop handles deployment
