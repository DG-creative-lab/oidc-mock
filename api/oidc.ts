import type { Configuration } from 'oidc-provider';
import { Provider } from 'oidc-provider';
import { getConfig } from '../src/config.js';

export const config = { runtime: 'nodejs', api: { bodyParser: false } };

let provider: Provider | undefined;

async function getProvider() {
  if (!provider) {
    const cfg = getConfig();
    const oidcCfg: Configuration = {
      clients: [
        {
          client_id: cfg.CLIENT_ID,
          client_secret: cfg.CLIENT_SECRET,
          redirect_uris: cfg.REDIRECT_URIS,
          grant_types: ['authorization_code', 'refresh_token', 'client_credentials'],
          response_types: ['code'],
          token_endpoint_auth_method: 'client_secret_basic',
        },
      ],
      jwks: cfg.SIGNING_JWKS,
      cookies: { keys: cfg.COOKIE_KEYS },
      features: { devInteractions: { enabled: true } },
      proxy: true,
    };
    provider = new Provider(cfg.ISSUER, oidcCfg);
  }
  return provider;
}

function normalizeOidcRequestUrl(req: any): string {
  const rawPath = req.query?.oidc_path;
  const pathValue = Array.isArray(rawPath) ? rawPath.join('/') : rawPath;
  const normalizedPath = pathValue ? `/${String(pathValue).replace(/^\/+/, '')}` : '/';

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query || {})) {
    if (key === 'oidc_path' || value == null) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, String(item));
      }
      continue;
    }
    params.append(key, String(value));
  }

  req.url = params.size > 0 ? `${normalizedPath}?${params.toString()}` : normalizedPath;

  if (req.url === '/authorize' || req.url.startsWith('/authorize?')) {
    req.url = req.url.replace('/authorize', '/auth');
  }

  return normalizedPath;
}

function buildDiscoveryDocument(issuer: string) {
  const base = issuer.replace(/\/$/, '');
  return {
    issuer: base,
    authorization_endpoint: `${base}/auth`,
    token_endpoint: `${base}/token`,
    userinfo_endpoint: `${base}/me`,
    jwks_uri: `${base}/jwks`,
    end_session_endpoint: `${base}/session/end`,
    pushed_authorization_request_endpoint: `${base}/request`,
    response_types_supported: ['code', 'code id_token', 'id_token', 'none'],
    response_modes_supported: ['query', 'fragment', 'form_post'],
    grant_types_supported: ['authorization_code', 'refresh_token', 'implicit'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    token_endpoint_auth_methods_supported: [
      'client_secret_basic',
      'client_secret_jwt',
      'client_secret_post',
      'private_key_jwt',
      'none',
    ],
    token_endpoint_auth_signing_alg_values_supported: [
      'HS256',
      'RS256',
      'PS256',
      'ES256',
      'Ed25519',
      'EdDSA',
    ],
    claims_supported: ['sub', 'sid', 'auth_time', 'iss'],
    claim_types_supported: ['normal'],
    claims_parameter_supported: false,
    code_challenge_methods_supported: ['S256'],
    scopes_supported: ['openid', 'offline_access'],
    authorization_response_iss_parameter_supported: true,
    request_uri_parameter_supported: false,
    dpop_signing_alg_values_supported: ['ES256', 'Ed25519', 'EdDSA'],
  };
}

export default async function handler(req: any, res: any) {
  const p = await getProvider();
  const cfg = getConfig();
  const normalizedPath = normalizeOidcRequestUrl(req);

  if (normalizedPath === '/' && req.method === 'GET') {
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    res.end('OIDC mock running. Try /api/oidc/.well-known/openid-configuration');
    return;
  }

  if (normalizedPath === '/.well-known/openid-configuration' && req.method === 'GET') {
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(buildDiscoveryDocument(cfg.ISSUER)));
    return;
  }

  return p.callback()(req, res);
}
