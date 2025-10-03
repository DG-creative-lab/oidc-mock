# OIDC Mock (Vercel + oidc-provider)

A lightweight OIDC issuer for testing Entra-like flows (Auth Code + PKCE, client_credentials).

## Setup

1) Install deps
```bash
npm i
```
##  Repo structure

```bash
oidc-mock-vercel/
├─ api/
│  └─ oidc/
│     └─ [...all].ts        # Vercel Serverless Function (all OIDC paths)
├─ src/
│  └─ config.ts             # Env parsing & validation
├─ scripts/
│  └─ generate-jwks.mjs     # One-time RSA keypair generator (prints private+public JWK)
├─ .env.example             # Local dev env template
├─ package.json
├─ tsconfig.json
├─ vercel.json
└─ README.md

```
## Generate keys (one-time)

```bsh
pnpm run gen:jwks
```
Copy the printed SIGNING_JWKS (private) to your envs.

## 	Local dev
 
```bash
cp .env.example .env.local   # (optional for vercel dev)
vercel dev
```

Discovery URL:
http://localhost:3000/api/oidc/.well-known/openid-configuration

## Vercel env vars (Project → Settings → Environment Variables)

* ISSUER = https://<project>.vercel.app/api/oidc
* CLIENT_ID = your-client-id
* CLIENT_SECRET = dev-secret
* REDIRECT_URIS = http://localhost:3000/callback
* COOKIE_KEYS = ["a-very-long-random-secret"]
* SIGNING_JWKS = (paste JSON from step 2)

Deploy. Use the discovery URL:
https://<project>.vercel.app/api/oidc/.well-known/openid-configuration

Notes
* Keep ISSUER stable (don’t point clients at preview URLs).
* Add more clients by extending clients in api/oidc/[...all].ts.
* For browser-based SPA flows, rely on PKCE; for machine-to-machine, use client_credentials.