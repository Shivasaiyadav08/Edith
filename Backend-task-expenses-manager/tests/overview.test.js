import { test } from 'node:test';
import assert from 'node:assert/strict';
import Task from '../models/Task.js';
import Expense from '../models/Expense.js';
import Project from '../models/Project.js';
import AiUsage from '../models/AiUsage.js';
import { overview } from '../lib/overview.js';
import Workspace from '../models/Workspace.js';

test('project overview scopes every task/expense query and keeps all-time profit separate from date ranges', async (t) => {
  t.mock.method(Workspace, 'findOne', () => ({ lean: async () => ({ currency: 'INR' }) }));
  const user = '000000000000000000000001',
    project = '000000000000000000000002';
  const assertScope = (scope) => {
    assert.equal(String(scope.user), user);
    assert.equal(String(scope.project), project);
  };
  const query = (rows) => ({
    sort() {
      return this;
    },
    limit() {
      return this;
    },
    lean: async () => rows,
  });
  t.mock.method(Task, 'find', (scope) => {
    assertScope(scope);
    assert.ok(scope.createdAt);
    return query([]);
  });
  t.mock.method(Expense, 'find', (scope) => {
    assertScope(scope);
    assert.ok(scope.date);
    return query([]);
  });
  t.mock.method(Project, 'find', (scope) => {
    assert.equal(String(scope.user), user);
    assert.equal(String(scope._id), project);
    return query([{ _id: project, budgetMinor: 10000, revenueMinor: 8000 }]);
  });
  t.mock.method(Task, 'aggregate', async (pipeline) => {
    assertScope(pipeline[0].$match);
    return [];
  });
  t.mock.method(Task, 'countDocuments', async (scope) => {
    assertScope(scope);
    return 0;
  });
  t.mock.method(Expense, 'aggregate', async (pipeline) => {
    assertScope(pipeline[0].$match);
    if (pipeline[1].$group._id === '$project') {
      assert.equal(pipeline[0].$match.date, undefined);
      return [{ _id: project, amountMinor: 9000 }];
    }
    assert.ok(pipeline[0].$match.date);
    return [];
  });
  t.mock.method(AiUsage, 'findOne', () => query(null));
  const result = await overview(user, { $gte: new Date('2026-10-01') }, project);
  assert.equal(result.projects.length, 1);
  assert.equal(result.projects[0].spentMinor, 9000);
  assert.equal(result.projects[0].profitMinor, -1000);
  assert.equal(result.stats.totalSpentMinor, 0);
  assert.equal(result.workspace.currency, 'INR');
});
