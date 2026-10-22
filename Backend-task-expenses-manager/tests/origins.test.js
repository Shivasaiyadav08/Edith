import { test } from 'node:test';
import assert from 'node:assert/strict';
import { originSettings } from '../lib/origins.js';
import { createAuth } from '../lib/auth.js';
import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { attachClientIP } from '../middleware/auth.js';

function configure(t, env) {
  for (const [name, value] of Object.entries(env)) {
    const previous = process.env[name];
    process.env[name] = value;
    t.after(() => {
      if (previous === undefined) delete process.env[name];
      else process.env[name] = previous;
    });
  }
}

test('local auth accepts both loopback names and keeps callbacks on the requested host', async (t) => {
  configure(t, {
    NODE_ENV: 'test',
    FRONTEND_URL: 'http://localhost:5173',
    BETTER_AUTH_URL: 'http://localhost:5173',
    BETTER_AUTH_SECRET: 'test-origin-secret-1234567890123456789012345',
  });
  const { origins, baseURL } = originSettings();
  assert.deepEqual(origins.sort(), ['http://127.0.0.1:5173', 'http://localhost:5173']);
  assert.ok(!origins.includes('http://localhost:5174'));
  assert.ok(!origins.includes('https://evil.example'));
  assert.deepEqual(baseURL.allowedHosts.sort(), ['127.0.0.1:5173', 'localhost:5173']);
  const auth = createAuth({});
  const context = await auth.$context;
  assert.equal(context.isTrustedOrigin('http://127.0.0.1:5173'), true);
  assert.equal(context.isTrustedOrigin('https://evil.example'), false);
  assert.notEqual(auth.options.advanced?.disableOriginCheck, true);
});

test('production keeps the configured domain without adding local development addresses', (t) => {
  configure(t, {
    NODE_ENV: 'production',
    FRONTEND_URL: 'https://edith.example',
    BETTER_AUTH_URL: 'https://edith.example',
  });
  assert.deepEqual(originSettings(), {
    origins: ['https://edith.example'],
    baseURL: 'https://edith.example',
  });
});

test('a deployed HTTPS origin does not enable local aliases when NODE_ENV is unset', (t) => {
  configure(t, {
    NODE_ENV: '',
    FRONTEND_URL: 'https://edith.example',
    BETTER_AUTH_URL: 'https://edith.example',
  });
  assert.deepEqual(originSettings().origins, ['https://edith.example']);
});

test('the server overwrites spoofed client IP headers with the Express-resolved IP', () => {
  const req = { headers: { 'x-edith-client-ip': '203.0.113.1' }, ip: '127.0.0.1', socket: {} };
  let continued = false;
  attachClientIP(req, {}, () => {
    continued = true;
  });
  assert.equal(req.headers['x-edith-client-ip'], '127.0.0.1');
  assert.equal(continued, true);
});

test('Google OAuth accepts the signed state cookie and rejects a callback without it', async (t) => {
  const origin = 'http://localhost:5173';
  configure(t, {
    NODE_ENV: 'test',
    FRONTEND_URL: origin,
    BETTER_AUTH_URL: origin,
    BETTER_AUTH_SECRET: 'test-oauth-secret-1234567890123456789012345',
  });
  const options = createAuth({}).options;
  const auth = betterAuth({
    ...options,
    database: memoryAdapter({
      auth_users: [],
      auth_accounts: [],
      auth_sessions: [],
      auth_verifications: [],
    }),
    rateLimit: { ...options.rateLimit, storage: 'memory' },
    socialProviders: { google: { clientId: 'test-client', clientSecret: 'test-secret' } },
    logger: { disabled: true },
  });
  const start = await auth.handler(
    new Request(`${origin}/api/auth/sign-in/social`, {
      method: 'POST',
      headers: {
        Origin: origin,
        'Content-Type': 'application/json',
        'x-edith-client-ip': '127.0.0.1',
      },
      body: JSON.stringify({
        provider: 'google',
        callbackURL: `${origin}/dashboard`,
        errorCallbackURL: `${origin}/login`,
        disableRedirect: true,
      }),
    }),
  );
  assert.equal(start.status, 200);
  const googleURL = new URL((await start.json()).url);
  assert.equal(new URL(googleURL.searchParams.get('redirect_uri')).origin, origin);
  const stateCookie = start.headers
    .getSetCookie()
    .find((cookie) => cookie.startsWith('edith.state='));
  assert.ok(stateCookie);
  assert.match(stateCookie, /HttpOnly/i);
  assert.match(stateCookie, /SameSite=Lax/i);
  assert.doesNotMatch(stateCookie, /; Secure/i);
  const callback = new URL(googleURL.searchParams.get('redirect_uri'));
  callback.searchParams.set('state', googleURL.searchParams.get('state'));
  // A cancelled Google consent verifies state without calling Google or creating a user.
  callback.searchParams.set('error', 'access_denied');
  const missing = await auth.handler(new Request(callback));
  assert.ok(
    new URL(missing.headers.get('location')).searchParams
      .getAll('error')
      .includes('state_mismatch'),
  );
  const valid = await auth.handler(
    new Request(callback, {
      headers: { Cookie: stateCookie.split(';')[0], 'x-edith-client-ip': '127.0.0.1' },
    }),
  );
  assert.ok(
    new URL(valid.headers.get('location')).searchParams.getAll('error').includes('access_denied'),
  );
});
