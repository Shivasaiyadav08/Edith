import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { createAuth } from '../lib/auth.js';
import { mailConfig, mailEnabled, emailDeliveryLimited, sendMail } from '../lib/mail.js';

const origin = 'http://localhost:5173';
const credentials = { email: 'signup@example.test', password: 'Test-password-12345' };
test('signup guidance identifies restricted senders without exposing configuration values', (t) => {
  configure(t);
  for (const sender of [
    'Edith <onboarding@resend.dev>',
    'owner@gmail.com',
    'Edith <owner@googlemail.com>',
  ]) {
    process.env.RESEND_FROM_EMAIL = sender;
    assert.equal(emailDeliveryLimited(), true);
  }
  process.env.RESEND_FROM_EMAIL = 'Edith <hello@example.test>';
  assert.equal(emailDeliveryLimited(), false);
  delete process.env.RESEND_API_KEY;
  assert.equal(emailDeliveryLimited(), true);
});
function configure(t, overrides = {}) {
  const env = {
    RESEND_API_KEY: 're_test_not_a_real_key',
    RESEND_FROM_EMAIL: 'Edith <hello@example.test>',
    FRONTEND_URL: origin,
    BETTER_AUTH_URL: origin,
    BETTER_AUTH_SECRET: 'test-email-secret-123456789012345678901234567',
    NODE_ENV: 'test',
    ...overrides,
  };
  for (const [key, value] of Object.entries(env)) {
    const old = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
    t.after(() => (old === undefined ? delete process.env[key] : (process.env[key] = old)));
  }
}
function fixture(t, { rateLimit = false } = {}) {
  configure(t);
  const sent = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails');
    assert.equal(options.method, 'POST');
    assert.equal(options.redirect, 'error');
    assert.ok(options.signal instanceof AbortSignal);
    assert.equal(options.headers.Authorization, 'Bearer re_test_not_a_real_key');
    sent.push(JSON.parse(options.body));
    return Response.json({ id: 'test-email-id' });
  });
  const db = { auth_users: [], auth_accounts: [], auth_sessions: [], auth_verifications: [] };
  const options = createAuth({}).options;
  const auth = betterAuth({
    ...options,
    database: memoryAdapter(db),
    rateLimit: rateLimit ? { ...options.rateLimit, storage: 'memory' } : { enabled: false },
    logger: { disabled: true },
  });
  const request = (path, body, headers = {}) =>
    auth.handler(
      new Request(`${origin}/api/auth/${path}`, {
        method: 'POST',
        headers: {
          Origin: origin,
          'Content-Type': 'application/json',
          'x-edith-client-ip': '127.0.0.1',
          ...headers,
        },
        body: JSON.stringify(body),
      }),
    );
  const signup = () =>
    request('sign-up/email', {
      ...credentials,
      name: 'Test Person',
      callbackURL: `${origin}/dashboard`,
    });
  const verify = () => auth.handler(new Request(sent[0].text.match(/https?:\/\/\S+/)[0]));
  const code = () => sent.at(-1).text.match(/: (\d{6})/)[1];
  return { auth, db, sent, request, signup, verify, code };
}

test('Resend delivers signup verification, unverified sign-in resend, and link verification', async (t) => {
  const { signup, request, sent, auth } = fixture(t);
  const signupResponse = await signup();
  assert.equal(signupResponse.status, 200);
  assert.equal((await signupResponse.json()).token, null);
  assert.equal(sent.length, 1, 'signup sends one verification link, not a second OTP');
  assert.deepEqual(sent[0].to, [credentials.email]);
  assert.equal((await request('sign-in/email', credentials)).status, 403);
  const resend = await request('send-verification-email', {
    email: credentials.email,
    callbackURL: `${origin}/dashboard`,
  });
  assert.equal(resend.status, 200);
  const verified = await auth.handler(new Request(sent.at(-1).text.match(/https?:\/\/\S+/)[0]));
  assert.equal(verified.status, 302);
  assert.equal(verified.headers.get('location'), `${origin}/dashboard`);
  const signedIn = await request('sign-in/email', credentials);
  assert.equal(signedIn.status, 200);
  assert.equal((await signedIn.json()).user.emailVerified, true);
});

test('reset links are single-use, change the password, and revoke existing sessions', async (t) => {
  const { signup, verify, request, sent, auth } = fixture(t);
  await signup();
  await verify();
  const signedIn = await request('sign-in/email', credentials);
  const cookie = signedIn.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ');
  const before = sent.length;
  const unknown = await request('request-password-reset', {
    email: 'unknown@example.test',
    redirectTo: `${origin}/reset-password`,
  });
  assert.equal(unknown.status, 200);
  assert.equal(sent.length, before);
  const resetRequest = await request('request-password-reset', {
    email: credentials.email,
    redirectTo: `${origin}/reset-password`,
  });
  assert.equal(resetRequest.status, 200);
  assert.deepEqual(await unknown.json(), await resetRequest.json());
  assert.match(sent.at(-1).subject, /Reset/);
  const callback = await auth.handler(new Request(sent.at(-1).text.match(/https?:\/\/\S+/)[0]));
  const token = new URL(callback.headers.get('location')).searchParams.get('token');
  assert.ok(token);
  const newPassword = 'Replacement-password-12345';
  assert.equal((await request('reset-password', { token, newPassword })).status, 200);
  assert.equal((await request('reset-password', { token, newPassword })).status, 400);
  assert.equal((await request('sign-in/email', credentials)).status, 401);
  assert.equal(
    (await request('sign-in/email', { ...credentials, password: newPassword })).status,
    200,
  );
  const session = await auth.handler(
    new Request(`${origin}/api/auth/get-session`, { headers: { Cookie: cookie } }),
  );
  assert.equal(await session.json(), null);
  assert.equal(
    (
      await request('request-password-reset', {
        email: credentials.email,
        redirectTo: 'https://untrusted.example/reset',
      })
    ).status,
    403,
  );
});

test('email verification OTPs are hashed, expire in five minutes, and cannot be reused', async (t) => {
  const { signup, request, code, db } = fixture(t);
  await signup();
  assert.equal(
    (
      await request('email-otp/send-verification-otp', {
        email: credentials.email,
        type: 'email-verification',
      })
    ).status,
    200,
  );
  const otp = code();
  const stored = db.auth_verifications.find((record) =>
    record.identifier.includes('email-verification'),
  );
  assert.ok(stored);
  assert.notEqual(stored.value, `${otp}:0`);
  assert.ok(new Date(stored.expiresAt).getTime() <= Date.now() + 300000);
  assert.equal(
    (await request('email-otp/verify-email', { email: credentials.email, otp })).status,
    200,
  );
  assert.equal(db.auth_users[0].emailVerified, true);
  assert.notEqual(
    (await request('email-otp/verify-email', { email: credentials.email, otp })).status,
    200,
  );
});

test('OTP sign-in supports existing accounts without creating accounts for unknown addresses', async (t) => {
  const { signup, request, sent, code, db } = fixture(t);
  await signup();
  const before = sent.length;
  assert.equal(
    (
      await request('email-otp/send-verification-otp', {
        email: 'unknown@example.test',
        type: 'sign-in',
      })
    ).status,
    200,
  );
  assert.equal(sent.length, before);
  assert.equal(db.auth_users.length, 1);
  await request('email-otp/send-verification-otp', { email: credentials.email, type: 'sign-in' });
  const otp = code();
  const login = await request('sign-in/email-otp', { email: credentials.email, otp });
  assert.equal(login.status, 200);
  assert.match(login.headers.get('set-cookie'), /HttpOnly/);
  assert.notEqual(
    (await request('sign-in/email-otp', { email: credentials.email, otp })).status,
    200,
  );
});

test('OTP password reset updates credentials, is single-use, and revokes sessions', async (t) => {
  const { signup, verify, request, code, auth } = fixture(t);
  await signup();
  await verify();
  const login = await request('sign-in/email', credentials);
  const cookie = login.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ');
  assert.equal(
    (await request('email-otp/request-password-reset', { email: credentials.email })).status,
    200,
  );
  const otp = code();
  const password = 'Changed-with-OTP-12345';
  assert.equal(
    (await request('email-otp/reset-password', { email: credentials.email, otp, password })).status,
    200,
  );
  assert.notEqual(
    (await request('email-otp/reset-password', { email: credentials.email, otp, password })).status,
    200,
  );
  assert.equal((await request('sign-in/email', credentials)).status, 401);
  assert.equal((await request('sign-in/email', { ...credentials, password })).status, 200);
  const session = await auth.handler(
    new Request(`${origin}/api/auth/get-session`, { headers: { Cookie: cookie } }),
  );
  assert.equal(await session.json(), null);
});

test('expired OTPs and codes with three failed attempts cannot be used', async (t) => {
  const { signup, request, code, db } = fixture(t);
  await signup();
  await request('email-otp/send-verification-otp', { email: credentials.email, type: 'sign-in' });
  const expired = code();
  db.auth_verifications.find((record) => record.identifier.includes('sign-in')).expiresAt =
    new Date(Date.now() - 1000);
  assert.notEqual(
    (await request('sign-in/email-otp', { email: credentials.email, otp: expired })).status,
    200,
  );
  await request('email-otp/send-verification-otp', { email: credentials.email, type: 'sign-in' });
  const otp = code();
  const wrong = otp === '000000' ? '111111' : '000000';
  for (let i = 0; i < 3; i++)
    assert.notEqual(
      (await request('sign-in/email-otp', { email: credentials.email, otp: wrong })).status,
      200,
    );
  assert.equal((await request('sign-in/email-otp', { email: credentials.email, otp })).status, 403);
});

test('OTP and reset email endpoints enforce send rate limits', async (t) => {
  const { signup, request } = fixture(t, { rateLimit: true });
  await signup();
  for (const [path, body] of [
    ['email-otp/send-verification-otp', { email: credentials.email, type: 'sign-in' }],
    [
      'request-password-reset',
      { email: credentials.email, redirectTo: `${origin}/reset-password` },
    ],
    ['send-verification-email', { email: credentials.email, callbackURL: `${origin}/dashboard` }],
  ]) {
    for (let i = 0; i < 3; i++) assert.equal((await request(path, body)).status, 200);
    assert.equal((await request(path, body)).status, 429);
  }
});

test('delivery failures are logged safely while Better Auth preserves generic background-mail responses', async (t) => {
  const { signup, request, db } = fixture(t);
  await signup();
  const logs = [];
  t.mock.method(console, 'error', (...args) => logs.push(args));
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ message: 'private-provider-response', name: 'secret' }, { status: 403 }),
  );
  for (const [path, body, status] of [
    [
      'send-verification-email',
      { email: credentials.email, callbackURL: `${origin}/dashboard` },
      503,
    ],
    [
      'request-password-reset',
      { email: credentials.email, redirectTo: `${origin}/reset-password` },
      200,
    ],
    [
      'email-otp/send-verification-otp',
      { email: credentials.email, type: 'email-verification' },
      200,
    ],
  ]) {
    const response = await request(path, body);
    assert.equal(response.status, status, path);
    const result = await response.json();
    if (status === 503) assert.equal(result.code, 'EMAIL_DELIVERY_FAILED');
    assert.doesNotMatch(JSON.stringify(result), /private-provider-response|re_test|signup@example/);
  }
  assert.equal(logs.length, 3);
  assert.equal(db.auth_users[0].emailVerified, false);
  assert.doesNotMatch(JSON.stringify(logs), /private-provider-response|re_test|signup@example/);
});

test('failed signup email never grants an unverified session and can be retried by resending', async (t) => {
  const { signup, request, db } = fixture(t);
  t.mock.method(console, 'error', () => {});
  const failure = t.mock.method(globalThis, 'fetch', async () =>
    Response.json({}, { status: 403 }),
  );
  const response = await signup();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).token, null);
  assert.equal(db.auth_users[0].emailVerified, false);
  assert.equal(db.auth_sessions.length, 0);
  failure.mock.restore();
  assert.equal(
    (await request('send-verification-email', { email: credentials.email })).status,
    200,
  );
});

test('Resend retries transient HTTP failures with the same idempotency key and payload', async (t) => {
  configure(t);
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push(options);
    return calls.length === 1
      ? Response.json({}, { status: 503 })
      : Response.json({ id: 'accepted' });
  });
  assert.deepEqual(await sendMail('recipient@example.test', 'Verify', 'Test'), { id: 'accepted' });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].body, calls[1].body);
  assert.equal(calls[0].headers['Idempotency-Key'], calls[1].headers['Idempotency-Key']);
});

test('Resend rate limits, network timeouts, invalid JSON and permanent errors are bounded and safe', async (t) => {
  configure(t);
  const logs = [];
  t.mock.method(console, 'error', (...args) => logs.push(args));
  for (const status of [400, 401, 403, 422, 429, 500]) {
    let calls = 0;
    const mock = t.mock.method(globalThis, 'fetch', async () => {
      calls++;
      return Response.json({ message: 'private secret response' }, { status });
    });
    await assert.rejects(
      sendMail('recipient@example.test', 'Verify', 'private OTP'),
      (error) => error.statusCode === 503,
    );
    assert.equal(calls, status === 429 || status >= 500 ? 2 : 1);
    mock.mock.restore();
  }
  let calls = 0;
  const timeout = t.mock.method(globalThis, 'fetch', async () => {
    calls++;
    throw new DOMException('private token', 'TimeoutError');
  });
  await assert.rejects(
    sendMail('recipient@example.test', 'Verify', 'private OTP'),
    (error) => error.statusCode === 503,
  );
  assert.equal(calls, 2);
  timeout.mock.restore();
  t.mock.method(globalThis, 'fetch', async () => new Response('invalid JSON', { status: 200 }));
  await assert.rejects(
    sendMail('recipient@example.test', 'Verify', 'private OTP'),
    (error) => error.statusCode === 503,
  );
  assert.doesNotMatch(JSON.stringify(logs), /private|re_test|recipient@example/);
});

test('production fails closed without valid Resend settings; local development remains optional', (t) => {
  configure(t, { RESEND_API_KEY: undefined, RESEND_FROM_EMAIL: undefined });
  assert.equal(mailEnabled(), false);
  assert.equal(createAuth({}).options.emailAndPassword.requireEmailVerification, false);
  process.env.NODE_ENV = 'production';
  assert.throws(() => createAuth({}), /RESEND_API_KEY/);
  process.env.RESEND_API_KEY = 're_test_not_a_real_key';
  process.env.RESEND_FROM_EMAIL = 'not an email';
  assert.throws(() => mailConfig(), /RESEND_FROM_EMAIL/);
  process.env.RESEND_FROM_EMAIL = 'Edith <hello@example.test>';
  assert.equal(createAuth({}).options.emailAndPassword.requireEmailVerification, true);
});

test('the committed environment template contains no provider credentials or SMTP configuration', async () => {
  const template = await readFile(new URL('../.env.example', import.meta.url), 'utf8');
  for (const match of template.matchAll(
    /^(BETTER_AUTH_SECRET|GOOGLE_CLIENT_ID|GOOGLE_CLIENT_SECRET|GEMINI_API_KEY|RESEND_API_KEY|RESEND_FROM_EMAIL)=(.*)$/gm,
  ))
    assert.equal(match[2].trim(), '', `${match[1]} must be blank in the shared template`);
  assert.doesNotMatch(template, /^SMTP_/m);
});
