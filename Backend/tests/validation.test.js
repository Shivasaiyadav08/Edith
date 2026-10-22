import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expenseInput, taskInput, projectInput, moneyMinor } from '../lib/validation.js';

test('project revenue distinguishes unknown, zero, and positive income and rejects invalid amounts', () => {
  assert.equal(projectInput.parse({ name: 'Project', revenue: null }).revenue, null);
  assert.equal(projectInput.parse({ name: 'Project', revenue: 0 }).revenue, 0);
  assert.equal(projectInput.parse({ name: 'Project', revenue: 123.45 }).revenue, 123.45);
  for (const revenue of [-1, 1.001, '100', Infinity])
    assert.equal(projectInput.safeParse({ name: 'Project', revenue }).success, false);
});

test('expense validation rejects negative, malformed, and fractional-cent amounts', () => {
  for (const amount of [-1, 'ten', 1.001, Infinity]) {
    assert.equal(
      expenseInput.safeParse({ title: 'Hosting', amount, category: 'Software' }).success,
      false,
    );
  }
  assert.equal(moneyMinor(120.15), 12015);
});
test('task validation rejects empty titles, invalid project IDs, and invalid dates', () => {
  for (const body of [
    { title: '   ' },
    { title: 'Task', project: 'invalid' },
    { title: 'Task', dueDate: 'yesterday' },
  ]) {
    assert.equal(taskInput.safeParse(body).success, false);
  }
  assert.equal(
    taskInput.safeParse({ title: 'Build site', dueDate: null, status: 'in-progress' }).success,
    true,
  );
});
test('project validation strips ownership and other untrusted fields', () => {
  const result = projectInput.parse({
    name: 'Website',
    budget: 1200,
    user: 'another-user',
    plan: 'pro',
  });
  assert.deepEqual(result, { name: 'Website', budget: 1200 });
});
