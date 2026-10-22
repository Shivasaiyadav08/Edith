import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apiRoutes } from '../routes/api.js';
import Workspace from '../models/Workspace.js';
import Project from '../models/Project.js';
import Expense from '../models/Expense.js';

test('workspace currency changes require acknowledgement when financial records exist and stay owner-scoped', async (t) => {
  const user = '000000000000000000000001';
  t.mock.method(Workspace, 'findOne', (scope) => {
    assert.equal(scope.user, user);
    return { lean: async () => ({ currency: 'USD' }) };
  });
  t.mock.method(Expense, 'exists', async (scope) => {
    assert.equal(scope.user, user);
    return true;
  });
  t.mock.method(Project, 'exists', async () => true);
  let saved;
  t.mock.method(Workspace, 'findOneAndUpdate', async (scope, body) => {
    assert.equal(scope.user, user);
    saved = body;
  });
  const handler = apiRoutes.stack.find((layer) => layer.route?.path === '/workspace').route.stack[0]
    .handle;
  const req = { user: { id: user }, body: { currency: 'INR' } };
  await assert.rejects(handler(req, { json() {} }), (error) => error.status === 400);
  assert.equal(saved, undefined);
  req.body.acknowledge = true;
  let result;
  await handler(req, {
    json(value) {
      result = value;
    },
  });
  assert.equal(saved.currency, 'INR');
  assert.equal(result.currency, 'INR');
  req.body.currency = 'INVALID';
  await assert.rejects(handler(req, { json() {} }));
});
