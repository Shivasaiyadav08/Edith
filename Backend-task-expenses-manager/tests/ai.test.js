import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aiRoutes } from '../routes/ai.js';
import AiUsage from '../models/AiUsage.js';
import Workspace from '../models/Workspace.js';

// Exercise the real Google SDK request/response path without a database or live API key.
function setup(t, output) {
  t.mock.method(Workspace, 'findOne', () => ({ lean: async () => ({ currency: 'USD' }) }));
  const previous = { key: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL };
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  delete process.env.GEMINI_MODEL;
  t.after(() => {
    for (const [name, value] of Object.entries({
      GEMINI_API_KEY: previous.key,
      GEMINI_MODEL: previous.model,
    })) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });
  const writes = [],
    calls = [];
  t.mock.method(AiUsage, 'updateOne', async (...args) => {
    writes.push(args);
  });
  t.mock.method(AiUsage, 'findOneAndUpdate', async () => ({ requests: 1 }));
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({
      url: String(url),
      headers: new Headers(options.headers),
      body: JSON.parse(options.body),
    });
    return Response.json({
      candidates: [
        {
          content: { role: 'model', parts: [{ text: JSON.stringify(output) }] },
          finishReason: 'STOP',
        },
      ],
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 15, totalTokenCount: 25 },
    });
  });
  return { calls, writes };
}

async function invoke(path, body, generate) {
  const handler = aiRoutes.stack.find((layer) => layer.route?.path === path).route.stack[0].handle;
  let result;
  await handler(
    { body, user: { id: 'test-user' }, app: { locals: { aiGenerate: generate } } },
    {
      json: (value) => {
        result = value;
      },
    },
  );
  return result;
}

test('task planning uses Google directly, the default Gemini model, and structured output', async (t) => {
  const plan = {
    summary: 'Start here',
    tasks: [{ title: 'Define the brief', description: 'Agree on scope', priority: 'high' }],
  };
  const { calls, writes } = setup(t, plan);
  assert.deepEqual(await invoke('/plan', { prompt: 'Plan a client website launch.' }), plan);
  assert.equal(calls.length, 1);
  assert.match(
    calls[0].url,
    /^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-3\.5-flash-lite:generateContent$/,
  );
  assert.equal(calls[0].headers.get('x-goog-api-key'), 'test-gemini-key');
  assert.equal(calls[0].body.generationConfig.responseMimeType, 'application/json');
  assert.ok(calls[0].body.generationConfig.responseJsonSchema);
  assert.equal(writes.at(-1)[1].$inc.inputTokens, 10);
});

const expense = {
  title: 'Design software',
  amount: 49,
  currency: 'USD',
  category: 'Software',
  merchant: 'Sample',
  date: null,
  notes: '',
};
test('expense capture accepts the configured Gemini model override', async (t) => {
  const { calls } = setup(t, expense);
  process.env.GEMINI_MODEL = 'custom-gemini-model';
  assert.deepEqual(
    await invoke('/capture', { prompt: 'Paid 49 USD for design software.' }),
    expense,
  );
  assert.match(calls[0].url, /models\/custom-gemini-model:generateContent$/);
});

test('receipt extraction sends image bytes to Gemini and returns an expense draft', async (t) => {
  const { calls } = setup(t, expense);
  const bytes = Buffer.from('89504e470d0a1a0a', 'hex');
  assert.deepEqual(
    await invoke('/receipt', { image: `data:image/png;base64,${bytes.toString('base64')}` }),
    expense,
  );
  const image = calls[0].body.contents[0].parts.find((part) => part.inlineData)?.inlineData;
  assert.equal(image.mimeType, 'image/png');
  assert.equal(image.data, bytes.toString('base64'));
});

test('a missing Gemini key rejects requests before reserving quota', async (t) => {
  const { calls, writes } = setup(t, {});
  delete process.env.GEMINI_API_KEY;
  await assert.rejects(
    invoke('/plan', { prompt: 'Plan a client website.' }),
    (error) => error.status === 503 && /GEMINI_API_KEY/.test(error.message),
  );
  assert.equal(calls.length, 0);
  assert.equal(writes.length, 0);
});

test('PDF scanning uses the new file upload field and forwards a native PDF to Gemini', async (t) => {
  const { calls } = setup(t, expense);
  const bytes = Buffer.from('%PDF-1.7\nSample invoice');
  assert.deepEqual(
    await invoke('/receipt', { file: `data:application/pdf;base64,${bytes.toString('base64')}` }),
    expense,
  );
  const content = calls[0].body.contents[0].parts.find((part) => part.inlineData)?.inlineData;
  assert.equal(content.mimeType, 'application/pdf');
  assert.equal(content.data, bytes.toString('base64'));
});

test('provider failures refund the reserved AI request', async (t) => {
  const { writes } = setup(t, {});
  await assert.rejects(
    invoke('/plan', { prompt: 'Plan a client website.' }, async () => {
      throw new Error('Provider unavailable');
    }),
    (error) => error.status === 502,
  );
  assert.equal(writes.at(-1)[1].$inc.requests, -1);
});
