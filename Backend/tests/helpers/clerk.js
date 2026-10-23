import { generateKeyPairSync, sign } from 'node:crypto';
import { clerkMiddleware } from '@clerk/express';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const origin = 'http://localhost:5173';
const issuer = 'https://clerk.edith.test';
const publishableKey = `pk_test_${Buffer.from('clerk.edith.test$').toString('base64')}`;

// Test-only keys verify real JWT signatures through Clerk without network requests.
export const authenticate = () =>
  clerkMiddleware({
    publishableKey,
    secretKey: 'sk_test_not_a_real_key',
    jwtKey: publicKey.export({ type: 'spki', format: 'pem' }),
    authorizedParties: [origin],
  });

export function sessionToken(userId, claims = {}) {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const body = `${encode({ alg: 'RS256', typ: 'JWT', kid: 'test-key' })}.${encode({
    sub: userId,
    sid: `sess_${userId}`,
    iss: issuer,
    azp: origin,
    iat: now,
    nbf: now - 5,
    exp: now + 60,
    v: 2,
    sts: 'active',
    fva: [0, -1],
    ...claims,
  })}`;
  return `${body}.${sign('RSA-SHA256', Buffer.from(body), privateKey).toString('base64url')}`;
}
