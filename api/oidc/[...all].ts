import type { Configuration } from 'oidc-provider';
import { Provider } from 'oidc-provider';
import { getConfig } from '../../src/config.js';

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
      // routes: { authorization: '/authorize' }, // optional alias
    };
    provider = new Provider(cfg.ISSUER, oidcCfg);
  }
  return provider!;
}

export default async function handler(req: any, res: any) {
  const p = await getProvider();

  // strip the base so oidc-provider sees native paths
  const base = '/api/oidc';
  if (req.url?.startsWith(base)) req.url = req.url.slice(base.length) || '/';

  // (optional) allow /authorize spelling
  if (req.url === '/authorize' || req.url?.startsWith('/authorize?')) {
    req.url = req.url.replace('/authorize', '/auth');
  }

  // tiny landing text at base
  if (req.url === '/' && req.method === 'GET') {
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    res.end('OIDC mock running. Try /.well-known/openid-configuration');
    return;
  }

  return p.callback()(req, res);
}