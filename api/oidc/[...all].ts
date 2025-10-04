// api/oidc.ts
import type { Configuration } from 'oidc-provider';
import { Provider } from 'oidc-provider';
import { getConfig } from '../../src/config.js';

let provider: Provider | undefined;

async function getProvider() {
  if (!provider) {
    const cfg = getConfig();

    const config: Configuration = {
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
      // optional: expose /authorize instead of /auth
      // routes: { authorization: '/authorize' },
    };

    provider = new Provider(cfg.ISSUER, config);
  }
  return provider!;
}

// set runtime explicitly (no vercel.json needed)
export const config = { runtime: 'nodejs20.x', api: { bodyParser: false } };

export default async function handler(req: any, res: any) {
  const p = await getProvider();

  // normalize path: strip base prefix so oidc-provider sees its native routes
  const base = '/api/oidc';
  if (req.url?.startsWith(base)) req.url = req.url.slice(base.length) || '/';

  // small landing hint
  if (req.url === '/' && req.method === 'GET') {
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    res.end('OIDC mock running. Try /.well-known/openid-configuration');
    return;
  }

  // accept /authorize alias
  if (req.url === '/authorize' || req.url?.startsWith('/authorize?')) {
    req.url = req.url.replace('/authorize', '/auth');
  }

  return p.callback()(req, res);
}