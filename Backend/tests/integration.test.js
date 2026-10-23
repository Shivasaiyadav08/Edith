import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import { createApp } from '../app.js';
import Account from '../models/Account.js';
import { authenticate, sessionToken } from './helpers/clerk.js';
import AiUsage from '../models/AiUsage.js';

let mongo, app, alice, bob, project, task;
const origin = 'http://localhost:5173';
const write = (agent, method, url, body) =>
  agent[method](url)
    .set('Origin', origin)
    .send(body || {});
before(
  async () => {
    process.env.FRONTEND_URL = origin;
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.GEMINI_MODEL = 'gemini-3.5-flash-lite';
    // Keep test files inside the project instead of the Windows sandbox temp folder.
    const dbPath = path.resolve('.runtime', `test-${Date.now()}`);
    await fs.mkdir(dbPath, { recursive: true });
    mongo = await MongoMemoryServer.create({ instance: { dbPath } });
    await mongoose.connect(mongo.getUri());
    await AiUsage.init();
    await Account.init();
    app = createApp({ authenticate: authenticate() });
    alice = supertest
      .agent(app)
      .set(
        'Authorization',
        'Bearer ' + sessionToken('user_alice', { exp: Math.floor(Date.now() / 1000) + 3600 }),
      );
    bob = supertest
      .agent(app)
      .set(
        'Authorization',
        'Bearer ' + sessionToken('user_bob', { exp: Math.floor(Date.now() / 1000) + 3600 }),
      );
  },
  { timeout: 180000 },
);
after(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

test('APIs reject missing and forged authentication', async () => {
  assert.equal((await supertest(app).get('/api/overview')).status, 401);
  assert.equal(
    (await supertest(app).get('/api/overview').set('Authorization', 'Bearer invalid')).status,
    401,
  );
});
test('projects, tasks, expenses, and budget totals work together', async () => {
  const p = await write(alice, 'post', '/api/projects', { name: 'Client website', budget: 1000.5 });
  assert.equal(p.status, 201, JSON.stringify(p.body));
  project = p.body._id;
  const t = await write(alice, 'post', '/api/tasks', {
    title: 'Build landing page',
    project,
    priority: 'high',
  });
  assert.equal(t.status, 201);
  task = t.body._id;
  const e = await write(alice, 'post', '/api/expenses', {
    title: 'Hosting',
    amount: 120.15,
    category: 'Infrastructure',
    project,
  });
  assert.equal(e.status, 201);
  assert.equal(e.body.amountMinor, 12015);
  assert.equal((await write(alice, 'patch', `/api/tasks/${task}`, { status: 'done' })).status, 200);
  const overview = await alice.get('/api/overview');
  assert.equal(overview.status, 200);
  assert.equal(overview.body.stats.totalSpentMinor, 12015);
  assert.equal(overview.body.projects[0].budgetMinor, 100050);
  assert.equal(overview.body.projects[0].doneCount, 1);
});
test('users cannot read, update, delete, or link another user’s records', async () => {
  assert.equal((await bob.get('/api/overview')).body.projects.length, 0);
  assert.equal((await write(bob, 'patch', `/api/tasks/${task}`, { title: 'Stolen' })).status, 404);
  assert.equal((await write(bob, 'delete', `/api/projects/${project}`)).status, 404);
  assert.equal(
    (await write(bob, 'post', '/api/tasks', { title: 'Cross-user link', project })).status,
    404,
  );
  const csv = await bob.get('/api/export/expenses');
  assert.equal(csv.status, 200);
  assert.ok(!csv.text.includes('Hosting'));
});

test('an explicitly linked Clerk account retains its existing MongoDB records and settings', async () => {
  const owner = new mongoose.Types.ObjectId();
  await Account.create({ clerkId: 'user_existing', owner });
  await mongoose.connection.collection('projects').insertOne({
    user: owner,
    name: 'Existing workspace project',
    budgetMinor: 75000,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await mongoose.connection.collection('workspaces').insertOne({ user: owner, currency: 'INR' });
  const response = await supertest(app)
    .get('/api/overview')
    .set('Authorization', `Bearer ${sessionToken('user_existing')}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.projects[0].name, 'Existing workspace project');
  assert.equal(response.body.workspace.currency, 'INR');
  assert.ok(
    !(await bob.get('/api/overview')).body.projects.some(
      (p) => p.name === 'Existing workspace project',
    ),
  );
});
test('API validates money and rejects cross-origin writes', async () => {
  assert.equal(
    (
      await write(alice, 'post', '/api/expenses', {
        title: 'Bad amount',
        amount: -1,
        category: 'Other',
      })
    ).status,
    400,
  );
  assert.equal(
    (await write(alice, 'patch', '/api/tasks/not-an-id', { title: 'Invalid' })).status,
    400,
  );
  assert.equal(
    (
      await alice
        .post('/api/tasks')
        .set('Origin', 'https://evil.example')
        .send({ title: 'Blocked' })
    ).status,
    403,
  );
});
test('AI retrieval is private, failures restore quota, and allowance is enforced', async () => {
  let context;
  app.locals.aiGenerate = async (options) => {
    context = await options.tools.workspaceSnapshot.execute({});
    return { text: 'Summary', totalUsage: { inputTokens: 100, outputTokens: 20 } };
  };
  const response = await write(bob, 'post', '/api/ai/ask', { prompt: 'What did I spend?' });
  assert.equal(response.status, 200);
  assert.equal(context.stats.totalSpentMinor, 0);
  assert.ok(!JSON.stringify(context).includes('Client website'));
  app.locals.aiGenerate = async () => {
    throw new Error('Provider unavailable');
  };
  assert.equal(
    (await write(bob, 'post', '/api/ai/plan', { prompt: 'Launch a client website' })).status,
    502,
  );
  const usage = await AiUsage.findOne();
  assert.equal(usage.requests, 1);
  await AiUsage.updateOne({ _id: usage._id }, { $set: { requests: 20 } });
  assert.equal(
    (await write(bob, 'post', '/api/ai/plan', { prompt: 'Launch a client website' })).status,
    429,
  );
});
test('CSV neutralizes formulas and linked projects are protected from deletion', async () => {
  await write(alice, 'post', '/api/expenses', {
    title: '=HYPERLINK("evil")',
    amount: 2,
    category: 'Other',
  });
  const csv = await alice.get('/api/export/expenses');
  assert.ok(csv.text.includes("'=HYPERLINK"));
  assert.equal((await write(alice, 'delete', `/api/projects/${project}`)).status, 409);
});
