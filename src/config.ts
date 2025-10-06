// src/config.ts
export type Env = {
  ISSUER: string;
  CLIENT_ID: string;
  CLIENT_SECRET: string;
  REDIRECT_URIS: string[];
  COOKIE_KEYS: string[];
  SIGNING_JWKS: { keys: any[] };
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

export function getConfig(): Env {
  // The ISSUER must match your deployment URL exactly
  const ISSUER = requireEnv('ISSUER'); // https://oidc-mock.vercel.app/api/oidc
  
  // Validate ISSUER format
  if (!ISSUER.startsWith('http://') && !ISSUER.startsWith('https://')) {
    throw new Error('ISSUER must start with http:// or https://');
  }
  
  const CLIENT_ID = requireEnv('CLIENT_ID');
  const CLIENT_SECRET = process.env.CLIENT_SECRET || 'dev-secret';
  
  const REDIRECT_URIS = (process.env.REDIRECT_URIS || 'http://localhost:3000/callback')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  
  // Validate redirect URIs
  REDIRECT_URIS.forEach(uri => {
    if (!uri.startsWith('http://') && !uri.startsWith('https://')) {
      throw new Error(`Invalid redirect URI: ${uri}`);
    }
  });
  
  let COOKIE_KEYS: string[];
  try {
    COOKIE_KEYS = JSON.parse(requireEnv('COOKIE_KEYS'));
  } catch (e) {
    throw new Error('COOKIE_KEYS must be valid JSON array: ' + (e instanceof Error ? e.message : ''));
  }
  
  if (!Array.isArray(COOKIE_KEYS) || COOKIE_KEYS.length === 0) {
    throw new Error('COOKIE_KEYS must be a JSON array with at least one secret');
  }
  
  let SIGNING_JWKS: { keys: any[] };
  try {
    SIGNING_JWKS = JSON.parse(requireEnv('SIGNING_JWKS'));
  } catch (e) {
    throw new Error('SIGNING_JWKS must be valid JSON: ' + (e instanceof Error ? e.message : ''));
  }
  
  if (!SIGNING_JWKS?.keys?.length) {
    throw new Error('SIGNING_JWKS must contain at least one key');
  }
  
  // Validate JWKS structure
  SIGNING_JWKS.keys.forEach((key, idx) => {
    if (!key.kty || !key.kid) {
      throw new Error(`SIGNING_JWKS key ${idx} missing required fields (kty, kid)`);
    }
    if (key.kty === 'RSA' && !key.d) {
      throw new Error(`SIGNING_JWKS key ${idx} is missing private key component (d)`);
    }
  });
  
  console.log('Config loaded:', {
    ISSUER,
    CLIENT_ID,
    REDIRECT_URIS,
    cookieKeysCount: COOKIE_KEYS.length,
    jwksKeysCount: SIGNING_JWKS.keys.length
  });
  
  return { ISSUER, CLIENT_ID, CLIENT_SECRET, REDIRECT_URIS, COOKIE_KEYS, SIGNING_JWKS };
}