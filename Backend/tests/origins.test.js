import { test } from 'node:test';
import assert from 'node:assert/strict';
import { originSettings } from '../lib/origins.js';

for (const [title, mode, url, expected] of [
  [
    'local aliases',
    'test',
    'http://localhost:5173',
    ['http://localhost:5173', 'http://127.0.0.1:5173'],
  ],
  ['exact production origin', 'production', 'https://edith.example', ['https://edith.example']],
  ['deployed origin without local aliases', '', 'https://edith.example', ['https://edith.example']],
]) {
  test(title, (t) => {
    const previous = { NODE_ENV: process.env.NODE_ENV, FRONTEND_URL: process.env.FRONTEND_URL };
    Object.assign(process.env, { NODE_ENV: mode, FRONTEND_URL: url });
    t.after(() => {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    });
    assert.deepEqual(originSettings().origins, expected);
  });
}
