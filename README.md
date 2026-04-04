# OIDC Mock (Vercel + oidc-provider)

A lightweight OIDC issuer for testing Gateplane's generic OIDC flow on Vercel.

## Runtime shape

This project uses a single Vercel function:

- `/api/oidc.ts`

And rewrites every request under:

- `/api/oidc/*`

back into that function via `vercel.json`.

That avoids relying on catch-all filesystem routing for plain Vercel Functions.

## Setup

Install dependencies:

```bash
pnpm install
```

Generate signing keys once:

```bash
pnpm run gen:jwks
```

Copy the private JWK set into `SIGNING_JWKS`.

## Local dev

```bash
cp .env.example .env.local
pnpm dev
```

Discovery URL:

```text
http://localhost:3000/api/oidc/.well-known/openid-configuration
```

## Required env vars

- `ISSUER=https://<project>.vercel.app/api/oidc`
- `CLIENT_ID=your-client-id`
- `CLIENT_SECRET=dev-secret`
- `REDIRECT_URIS=https://gateplane-beta.vercel.app/api/v1/auth/callback`
- `COOKIE_KEYS=["a-very-long-random-secret"]`
- `SIGNING_JWKS={"keys":[{...private JWK...}]}`

## Gateplane recommendation

For Gateplane's generic OIDC provider config, use the discovery URL:

```text
https://<project>.vercel.app/api/oidc/.well-known/openid-configuration
```

and set the provider authority to either:

- the issuer base: `https://<project>.vercel.app/api/oidc`
- or directly the discovery URL

## Notes

- Keep `ISSUER` stable. Do not point clients at preview URLs if you want stable tokens.
- The mock supports authorization code with PKCE and refresh tokens.
- `/authorize` is normalized to the provider's internal `/auth` route for convenience.
