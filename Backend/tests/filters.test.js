import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordScopes, reportFilters } from '../lib/filters.js';
import { csvRow, reportRow } from '../lib/csv.js';

test('date filters cover projects, tasks and expense transactions with inclusive end dates', () => {
  const { range } = reportFilters({ from: '2026-10-22', to: '2026-10-22' });
  assert.equal(range.$lt.toISOString(), '2026-10-23T00:00:00.000Z');
  const scopes = recordScopes('000000000000000000000001', range, '000000000000000000000002', {
    category: 'Software',
    q: 'a.b',
  });
  assert.deepEqual(scopes.tasks.createdAt, range);
  assert.deepEqual(scopes.projects.createdAt, range);
  assert.deepEqual(scopes.expenses.date, range);
  assert.equal(scopes.expenses.category, 'Software');
  assert.equal(scopes.expenses.$or[0].title.$regex, 'a\\.b');
  assert.equal(String(scopes.tasks.user), '000000000000000000000001');
  assert.equal(String(scopes.expenses.project), '000000000000000000000002');
  assert.equal(scopes.scope.date, undefined); // All-time project finances remain separate.
});

test('invalid, reversed, and malformed filter inputs are rejected', () => {
  for (const query of [
    { from: '2026-02-30' },
    { from: 'today' },
    { from: '2026-10-23', to: '2026-10-22' },
    { project: 'someone-else' },
    { category: { $ne: '' } },
  ])
    assert.throws(() => reportFilters(query));
});

test('CSV exports escape quotes, newlines and spreadsheet formula injection', () => {
  assert.equal(csvRow(['normal', 'a"b', 'line\nnext']), '"normal","a""b","line\nnext"\r\n');
  assert.ok(csvRow(['  =SUM(A1)', '@command', '-5']).includes("'  =SUM"));
  assert.ok(reportRow({ Section: 'Project', Revenue: 0 }).startsWith('"Project"'));
});
