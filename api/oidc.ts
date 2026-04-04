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

function normalizeOidcRequestUrl(req: any) {
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
}

export default async function handler(req: any, res: any) {
  const p = await getProvider();

  normalizeOidcRequestUrl(req);

  if (req.url === '/' && req.method === 'GET') {
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    res.end('OIDC mock running. Try /api/oidc/.well-known/openid-configuration');
    return;
  }

  return p.callback()(req, res);
}
