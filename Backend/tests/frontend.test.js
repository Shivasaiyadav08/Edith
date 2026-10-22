import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mountFrontend, frontendDist } from '../lib/frontend.js';

test('production deep links return the frontend while API and missing assets remain separate', () => {
  let route, handler, staticHandler;
  mountFrontend({
    use(fn) {
      staticHandler = fn;
    },
    get(pattern, fn) {
      route = pattern;
      handler = fn;
    },
  });
  assert.equal(typeof staticHandler, 'function');
  assert.equal(route, '/{*page}');
  for (const page of ['/', '/login', '/reports', '/projects']) {
    let served, cache;
    handler(
      { path: page, accepts: (type) => type === 'html' },
      { setHeader: (key, value) => (cache = value), sendFile: (file) => (served = file) },
      () => assert.fail('A frontend route should load the app.'),
    );
    assert.equal(served, path.join(frontendDist, 'index.html'));
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
