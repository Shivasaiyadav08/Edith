import { test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import supertest from 'supertest';
import fs from 'node:fs/promises';
import { createApp } from '../app.js';
import { resolveOwner } from '../middleware/auth.js';
import Account from '../models/Account.js';
import { authenticate, sessionToken } from './helpers/clerk.js';

test('Clerk rejects missing, forged, expired, and wrong-origin credentials before touching data', async (t) => {
  t.mock.method(Account, 'findOneAndUpdate', () => assert.fail('Do not resolve unverified users.'));
  const app = createApp({ authenticate: authenticate() });
  const [header, payload, signature] = sessionToken('user_alice').split('.');
  const tampered = `${header}.${payload}.${signature[0] === 'a' ? 'b' : 'a'}${signature.slice(1)}`;
  for (const token of [
    null,
    'forged.token.value',
    sessionToken('user_alice', { exp: 1 }),
    tampered,
    sessionToken('user_alice', { sts: 'pending' }),
    sessionToken('user_alice', { azp: 'https://evil.example' }),
  ]) {
    const req = supertest(app).get('/api/overview').set('x-user-id', 'user_alice');
    if (token) req.set('Authorization', `Bearer ${token}`);
    const response = await req;
    assert.equal(response.status, 401, response.text);
  }
  assert.equal((await supertest(app).get('/api/health')).status, 200);
});

test('verified bearer sessions resolve only their own stable MongoDB owner', async (t) => {
  const owner = new mongoose.Types.ObjectId();
  t.mock.method(Account, 'findOneAndUpdate', async (scope) => {
    assert.deepEqual(scope, { clerkId: 'user_alice' });
    return { owner };
  });
  const app = createApp({ authenticate: authenticate() });
  // Unknown protected endpoints still run both identity verification and owner mapping.
  const response = await supertest(app)
    .get('/api/missing')
    .set('Authorization', `Bearer ${sessionToken('user_alice')}`);
  assert.equal(response.status, 404, response.text);
});

test('concurrent first sign-ins recover only the same identity; database failures propagate', async (t) => {
  const duplicate = Object.assign(new Error('duplicate'), { code: 11000 });
  t.mock.method(Account, 'findOneAndUpdate', async () => {
    throw duplicate;
  });
  const owner = { owner: new mongoose.Types.ObjectId() };
  t.mock.method(Account, 'findOne', async (scope) => {
    assert.deepEqual(scope, { clerkId: 'user_alice' });
    return owner;
  });
  assert.equal(await resolveOwner('user_alice'), owner);
  Account.findOneAndUpdate.mock.mockImplementation(async () => {
    throw new Error('unavailable');
  });
  await assert.rejects(resolveOwner('user_alice'), /unavailable/);
});

test('environment templates contain only blank provider keys', async () => {
  for (const name of ['../.env.example', '../../Frontend/.env.example']) {
    const template = await fs.readFile(new URL(name, import.meta.url), 'utf8');
    for (const match of template.matchAll(/^\w*(?:KEY|SECRET)=(.*)$/gm)) assert.equal(match[1], '');
    assert.doesNotMatch(template, /BETTER_AUTH|RESEND|GOOGLE_CLIENT|SMTP/);
  }
});
