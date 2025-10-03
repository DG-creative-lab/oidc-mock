// src/config.ts
export type Env = {
  ISSUER: string;
  CLIENT_ID: string;
  CLIENT_SECRET: string;
  REDIRECT_URIS: string[];
  COOKIE_KEYS: string[];      // e.g. ["very-long-random-secret"]
  SIGNING_JWKS: { keys: any[] }; // private JWK(s) with "d", "p", "q"...
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

export function getConfig(): Env {
  const ISSUER = requireEnv('ISSUER'); // e.g. https://<project>.vercel.app/api/oidc
  const CLIENT_ID = requireEnv('CLIENT_ID');
  const CLIENT_SECRET = process.env.CLIENT_SECRET || 'dev-secret';

  const REDIRECT_URIS = (process.env.REDIRECT_URIS || 'http://localhost:3000/callback')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const COOKIE_KEYS = JSON.parse(requireEnv('COOKIE_KEYS')); // '["long-secret"]'
  if (!Array.isArray(COOKIE_KEYS) || COOKIE_KEYS.length === 0)
    throw new Error('COOKIE_KEYS must be a JSON array with at least one secret');

  const SIGNING_JWKS = JSON.parse(requireEnv('SIGNING_JWKS')); // {"keys":[{...private JWK...}]}
  if (!SIGNING_JWKS?.keys?.length) throw new Error('SIGNING_JWKS must contain at least one key');

  return { ISSUER, CLIENT_ID, CLIENT_SECRET, REDIRECT_URIS, COOKIE_KEYS, SIGNING_JWKS };
}