import type { Configuration } from 'oidc-provider';
import { Provider } from 'oidc-provider';
import { getConfig } from '../../src/config.js';

export const config = { 
  runtime: 'nodejs', 
  api: { bodyParser: false } 
};

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
      cookies: { 
        keys: cfg.COOKIE_KEYS,
        short: { signed: true },
        long: { signed: true }
      },
      features: { 
        devInteractions: { enabled: true },
        introspection: { enabled: true },
        revocation: { enabled: true }
      },
      
      // Important: Tell oidc-provider to trust proxy headers
      proxy: true,
      
      // Configure claims
      claims: {
        openid: ['sub'],
        email: ['email', 'email_verified'],
        profile: ['name', 'given_name', 'family_name']
      },
      
      // Add findAccount to provide user data
      findAccount: async (ctx, id) => {
        return {
          accountId: id,
          async claims() {
            return {
              sub: id,
              email: `${id}@example.com`,
              email_verified: true,
              name: 'Test User',
              given_name: 'Test',
              family_name: 'User'
            };
          }
        };
      },
      
      // TTL settings (optional)
      ttl: {
        AccessToken: 3600,
        AuthorizationCode: 600,
        IdToken: 3600,
        RefreshToken: 86400 * 14
      }
    };
    
    provider = new Provider(cfg.ISSUER, oidcCfg);
    
    // Critical: Initialize the provider
    await provider.initialize();
    
    console.log('OIDC Provider initialized with issuer:', cfg.ISSUER);
  }
  
  return provider!;
}

export default async function handler(req: any, res: any) {
  try {
    const p = await getProvider();
    
    // Store original URL for debugging
    const originalUrl = req.url;
    
    // Strip the base path so oidc-provider sees native paths
    const base = '/api/oidc';
    if (req.url?.startsWith(base)) {
      req.url = req.url.slice(base.length) || '/';
    }
    
    // Normalize authorization endpoint
    if (req.url === '/authorize' || req.url?.startsWith('/authorize?')) {
      req.url = req.url.replace('/authorize', '/auth');
    }
    
    // Debug logging (remove in production)
    console.log('Request:', {
      method: req.method,
      originalUrl,
      rewrittenUrl: req.url
    });
    
    // Handle root endpoint with info
    if (req.url === '/' && req.method === 'GET') {
      res.setHeader('content-type', 'text/html; charset=utf-8');
      res.end(`
        <!DOCTYPE html>
        <html>
        <head><title>OIDC Mock Provider</title></head>
        <body>
          <h1>OIDC Mock Provider Running</h1>
          <p>Available endpoints:</p>
          <ul>
            <li><a href="/api/oidc/.well-known/openid-configuration">OpenID Configuration</a></li>
            <li><a href="/api/oidc/jwks">JWKS (Public Keys)</a></li>
            <li><a href="/api/oidc/token">Token Endpoint</a> (POST)</li>
            <li><a href="/api/oidc/auth">Authorization Endpoint</a></li>
          </ul>
        </body>
        </html>
      `);
      return;
    }
    
    // Pass to oidc-provider callback
    return p.callback()(req, res);
    
  } catch (error) {
    console.error('OIDC Handler Error:', error);
    res.status(500).json({ 
      error: 'internal_server_error',
      error_description: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}