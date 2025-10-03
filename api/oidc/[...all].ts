// api/oidc/[...all].ts
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
      // Use a stable signing key (private JWK) so tokens stay verifiable across cold starts
      jwks: cfg.SIGNING_JWKS,
      cookies: { keys: cfg.COOKIE_KEYS },
      features: {
        devInteractions: { enabled: true }, // handy fake login UI
      },
      proxy: true, // trust Vercel's proxy for secure cookies, HTTPS, etc.
    };

    provider = new Provider(cfg.ISSUER, config);
    await provider.initialize();
  }
  return provider!;
}

export const config = { api: { bodyParser: false } };

export default async function handler(req: any, res: any) {
  const p = await getProvider();
  return p.callback()(req, res);
}