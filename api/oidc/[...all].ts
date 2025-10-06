// api/oidc/[...all].ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Configuration } from 'oidc-provider';
import { Provider } from 'oidc-provider';
import { getConfig } from '../../src/config.js';

// Vercel serverless function config
export const config = { 
  runtime: 'nodejs',
  maxDuration: 60
};

let provider: Provider | undefined;
let initPromise: Promise<Provider> | undefined;

async function getProvider() {
  // Ensure we only initialize once, even with concurrent requests
  if (initPromise) {
    return initPromise;
  }
  
  if (provider) {
    return provider;
  }
  
  initPromise = (async () => {
    const cfg = getConfig();
    
    console.log('Initializing OIDC Provider with issuer:', cfg.ISSUER);
    
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
        short: { signed: true, maxAge: 600000 }, // 10 minutes
        long: { signed: true, maxAge: 86400000 } // 1 day
      },
      features: { 
        devInteractions: { enabled: true },
        introspection: { enabled: true },
        revocation: { enabled: true }
      },
      
      // Trust proxy headers (required for Vercel)
      proxy: true,
      
      // Configure claims
      claims: {
        openid: ['sub'],
        email: ['email', 'email_verified'],
        profile: ['name', 'given_name', 'family_name']
      },
      
      // Mock user account lookup
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
      
      // Token TTLs
      ttl: {
        AccessToken: 3600,
        AuthorizationCode: 600,
        IdToken: 3600,
        RefreshToken: 86400 * 14
      },
      
      // Rendering options
      renderError: async (ctx, out, error) => {
        ctx.type = 'html';
        ctx.body = `
          <!DOCTYPE html>
          <html>
          <head><title>Error</title></head>
          <body>
            <h1>OIDC Error</h1>
            <pre>${JSON.stringify({ error: out.error, error_description: out.error_description }, null, 2)}</pre>
          </body>
          </html>
        `;
      }
    };
    
    const p = new Provider(cfg.ISSUER, oidcCfg);
    
    // Initialize the provider - this is crucial!
    await p.initialize();
    
    console.log('OIDC Provider initialized successfully');
    
    provider = p;
    return p;
  })();
  
  return initPromise;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log('=== OIDC Request ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Headers:', JSON.stringify({
      host: req.headers.host,
      'x-forwarded-proto': req.headers['x-forwarded-proto'],
      'x-forwarded-host': req.headers['x-forwarded-host']
    }));
    
    const p = await getProvider();
    
    // Create a mock Node.js request/response
    const mockReq: any = {
      ...req,
      url: req.url || '/',
      method: req.method,
      headers: req.headers,
      socket: {
        encrypted: req.headers['x-forwarded-proto'] === 'https'
      },
      connection: {
        encrypted: req.headers['x-forwarded-proto'] === 'https'
      }
    };
    
    const mockRes: any = {
      ...res,
      statusCode: 200,
      setHeader: (name: string, value: string | string[]) => {
        res.setHeader(name, value);
        return mockRes;
      },
      removeHeader: (name: string) => {
        res.removeHeader(name);
        return mockRes;
      },
      end: (data?: any) => {
        if (data) {
          res.send(data);
        } else {
          res.end();
        }
      },
      getHeader: (name: string) => res.getHeader(name),
      write: (chunk: any) => {
        // Store chunks for later
        if (!mockRes._chunks) mockRes._chunks = [];
        mockRes._chunks.push(chunk);
      }
    };
    
    // Store original URL
    const originalUrl = mockReq.url;
    
    // Strip /api/oidc prefix
    const base = '/api/oidc';
    if (mockReq.url.startsWith(base)) {
      mockReq.url = mockReq.url.slice(base.length) || '/';
    }
    
    // Handle /authorize alias
    if (mockReq.url === '/authorize' || mockReq.url.startsWith('/authorize?')) {
      mockReq.url = mockReq.url.replace('/authorize', '/auth');
    }
    
    console.log('Rewritten URL:', mockReq.url);
    console.log('Original URL:', originalUrl);
    
    // Handle root endpoint
    if (mockReq.url === '/' && mockReq.method === 'GET') {
      res.setHeader('content-type', 'text/html; charset=utf-8');
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>OIDC Mock Provider</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            h1 { color: #333; }
            a { color: #0070f3; text-decoration: none; }
            a:hover { text-decoration: underline; }
            ul { line-height: 2; }
            code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
          </style>
        </head>
        <body>
          <h1>🔐 OIDC Mock Provider</h1>
          <p>OpenID Connect mock server is running successfully!</p>
          
          <h2>Available Endpoints:</h2>
          <ul>
            <li><a href="/api/oidc/.well-known/openid-configuration">OpenID Configuration</a> - Discovery document</li>
            <li><a href="/api/oidc/jwks">JWKS</a> - Public signing keys</li>
            <li><code>/api/oidc/auth</code> - Authorization endpoint (GET/POST)</li>
            <li><code>/api/oidc/token</code> - Token endpoint (POST)</li>
            <li><code>/api/oidc/userinfo</code> - UserInfo endpoint (GET/POST)</li>
          </ul>
          
          <h2>Configuration:</h2>
          <ul>
            <li><strong>Issuer:</strong> <code>${process.env.ISSUER}</code></li>
            <li><strong>Client ID:</strong> <code>${process.env.CLIENT_ID}</code></li>
          </ul>
        </body>
        </html>
      `);
    }
    
    // Call oidc-provider
    const callback = p.callback();
    await callback(mockReq, mockRes);
    
    // If chunks were written, send them
    if (mockRes._chunks && mockRes._chunks.length > 0) {
      res.send(Buffer.concat(mockRes._chunks.map((c: any) => 
        typeof c === 'string' ? Buffer.from(c) : c
      )));
    }
    
  } catch (error) {
    console.error('OIDC Handler Error:', error);
    
    res.status(500).json({ 
      error: 'server_error',
      error_description: error instanceof Error ? error.message : 'Unknown error occurred',
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
    });
  }
}