import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apiRoutes } from '../routes/api.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import Expense from '../models/Expense.js';
import Workspace from '../models/Workspace.js';
import AiUsage from '../models/AiUsage.js';

test('full report exports every matching project, task and expense beyond page one', async (t) => {
  const user = '000000000000000000000001',
    id = '000000000000000000000002';
  const project = {
    _id: id,
    name: 'Client project',
    budgetMinor: 10000,
    revenueMinor: 20000,
    createdAt: new Date('2026-10-22'),
  };
  const tasks = Array.from({ length: 125 }, (_, i) => ({
    _id: 't' + i,
    project: id,
    title: 'Task ' + i,
    status: 'todo',
    createdAt: new Date('2026-10-22'),
  }));
  const expenses = Array.from({ length: 130 }, (_, i) => ({
    _id: 'e' + i,
    project: id,
    title: 'Expense ' + i,
    amountMinor: 100,
    date: new Date('2026-10-22'),
    notes: 'Kept in export',
  }));
  const query = (rows) => ({
    sort() {
      return this;
    },
    limit() {
      return query(rows.slice(0, 100));
    },
    select() {
      return this;
    },
    lean: async () => rows,
    cursor: async function* () {
      yield* rows;
    },
  });
  const assertOwner = (scope) => assert.equal(String(scope.user), user);
  t.mock.method(Project, 'find', (scope) => {
    assertOwner(scope);
    return query([project]);
  });
  t.mock.method(Task, 'find', (scope) => {
    assertOwner(scope);
    assert.ok(scope.createdAt);
    return query(tasks);
  });
  t.mock.method(Expense, 'find', (scope) => {
    assertOwner(scope);
    assert.ok(scope.date);
    return query(expenses);
  });
  t.mock.method(Task, 'aggregate', async () => []);
  t.mock.method(Task, 'countDocuments', async () => 0);
  t.mock.method(Expense, 'aggregate', async (pipeline) =>
    pipeline[1].$group._id === '$project' ? [{ _id: id, amountMinor: 13000 }] : [],
  );
  t.mock.method(Workspace, 'findOne', (scope) => {
    assertOwner(scope);
    return query([{ currency: 'INR' }][0]);
  });
  t.mock.method(AiUsage, 'findOne', () => query(null));
  const handler = apiRoutes.stack.find((layer) => layer.route?.path === '/export/report').route
    .stack[0].handle;
  let csv = '',
    ended = false;
  await handler(
    { user: { id: user }, query: { from: '2026-10-22', to: '2026-10-22' } },
    {
      setHeader() {},
      write(value) {
        csv += value;
      },
      end() {
        ended = true;
      },
    },
  );
  assert.equal(ended, true);
  assert.equal((csv.match(/^"Task"/gm) || []).length, 125);
  assert.equal((csv.match(/^"Expense"/gm) || []).length, 130);
  assert.ok(csv.includes('"Project"'));
  assert.ok(csv.includes('"INR"'));
  assert.ok(csv.includes('Kept in export'));
  assert.ok(csv.includes('"200","130"')); // Project revenue and all-time linked costs.
});
