// scripts/generate-jwks.mjs
import { generateKeyPair, exportJWK } from 'jose';

const { publicKey, privateKey } = await generateKeyPair('RS256', { modulusLength: 2048 });

const kid = 'dev-' + Math.random().toString(36).slice(2);

const pub = await exportJWK(publicKey);
pub.kid = kid; pub.use = 'sig'; pub.alg = 'RS256';

const prv = await exportJWK(privateKey);
prv.kid = kid; prv.use = 'sig'; prv.alg = 'RS256';

console.log('SIGNING_JWKS (private, put in env SIGNING_JWKS):');
console.log(JSON.stringify({ keys: [prv] }, null, 2));
console.log('\nPUBLIC_JWKS (for reference only):');
console.log(JSON.stringify({ keys: [pub] }, null, 2));
console.log('SIGNING_JWKS (single line):');
console.log(JSON.stringify({ keys: [prv] }));