// scripts/test-endpoints.mjs
// Test script to verify OIDC endpoints are working

const BASE_URL = process.env.TEST_URL || 'https://oidc-mock.vercel.app';

const endpoints = [
  { path: '/api/oidc/', method: 'GET', name: 'Root' },
  { path: '/api/oidc/.well-known/openid-configuration', method: 'GET', name: 'Discovery' },
  { path: '/api/oidc/jwks', method: 'GET', name: 'JWKS' }
];

console.log(`Testing OIDC endpoints at: ${BASE_URL}\n`);

for (const endpoint of endpoints) {
  const url = `${BASE_URL}${endpoint.path}`;
  
  try {
    console.log(`Testing ${endpoint.name}: ${endpoint.method} ${endpoint.path}`);
    
    const response = await fetch(url, { method: endpoint.method });
    const status = response.status;
    const statusText = response.statusText;
    
    console.log(`  Status: ${status} ${statusText}`);
    
    if (status === 200) {
      const contentType = response.headers.get('content-type');
      console.log(`  Content-Type: ${contentType}`);
      
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        console.log(`  Response keys: ${Object.keys(data).join(', ')}`);
        
        // Validate discovery document
        if (endpoint.path.includes('openid-configuration')) {
          const requiredFields = ['issuer', 'authorization_endpoint', 'token_endpoint', 'jwks_uri'];
          const missing = requiredFields.filter(f => !data[f]);
          if (missing.length > 0) {
            console.log(`  ⚠️  Missing required fields: ${missing.join(', ')}`);
          } else {
            console.log(`  ✅ All required fields present`);
          }
        }
      } else if (contentType?.includes('text/html')) {
        const text = await response.text();
        console.log(`  HTML length: ${text.length} characters`);
      }
      
      console.log(`  ✅ SUCCESS\n`);
    } else {
      const text = await response.text();
      console.log(`  ❌ FAILED`);
      console.log(`  Response: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}\n`);
    }
  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}\n`);
  }
}

console.log('Testing complete!');