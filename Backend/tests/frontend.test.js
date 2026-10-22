import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdirSync, mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { mountFrontend } from '../lib/frontend.js';

test('production deep links return the frontend while API and missing assets remain separate', (t) => {
  const parent = path.resolve('.runtime');
  mkdirSync(parent, { recursive: true });
  const directory = mkdtempSync(path.join(parent, 'frontend-test-'));
  writeFileSync(path.join(directory, 'index.html'), '<!doctype html><title>Edith</title>');
  t.after(() => {
    unlinkSync(path.join(directory, 'index.html'));
    rmdirSync(directory);
  });
  let route, handler, staticHandler;
  const mounted = mountFrontend(
    {
      use(fn) {
        staticHandler = fn;
      },
      get(pattern, fn) {
        route = pattern;
        handler = fn;
      },
    },
    directory,
  );
  assert.equal(mounted, true);
  assert.equal(typeof staticHandler, 'function');
  assert.equal(route, '/{*page}');
  for (const page of ['/', '/login', '/reports', '/projects']) {
    let served, cache;
    handler(
      { path: page, accepts: (type) => type === 'html' },
      { setHeader: (key, value) => (cache = value), sendFile: (file) => (served = file) },
      () => assert.fail('A frontend route should load the app.'),
    );
    assert.equal(served, path.join(directory, 'index.html'));
    assert.equal(cache, 'no-cache');
  }
  for (const page of ['/api', '/api/unknown', '/assets/missing.js', '/missing.png']) {
    let next = false;
    handler(
      { path: page, accepts: () => true },
      {
        sendFile() {
          assert.fail('Do not return HTML for APIs or missing assets.');
        },
      },
      () => (next = true),
    );
    assert.equal(next, true);
  }
});

test('backend-only deployments skip frontend middleware when no build exists', () => {
  const mounted = mountFrontend(
    {
      use() {
        assert.fail('Do not mount static middleware without a frontend build.');
      },
      get() {
        assert.fail('Do not mount frontend routes without a frontend build.');
      },
    },
    path.resolve('.runtime', 'missing-frontend-build'),
  );
  assert.equal(mounted, false);
});
