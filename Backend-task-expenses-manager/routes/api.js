import express from 'express';
import { z } from 'zod';
import Task from '../models/Task.js';
import Expense from '../models/Expense.js';
import Project from '../models/Project.js';
import {
  taskInput,
  expenseInput,
  projectInput,
  fail,
  parseId,
  moneyMinor,
} from '../lib/validation.js';
import { overview } from '../lib/overview.js';
import { recordScopes, reportFilters } from '../lib/filters.js';
import { csvRow, reportColumns, reportRow } from '../lib/csv.js';
import Workspace, { currencies } from '../models/Workspace.js';

export const apiRoutes = express.Router();

async function checkProject(user, project) {
  if (project && !(await Project.exists({ _id: project, user }))) fail(404, 'Project not found.');
}

apiRoutes.get('/overview', async (req, res) => {
  const { range, project, ...filters } = reportFilters(req.query);
  await checkProject(req.user.id, project);
  res.json(await overview(req.user.id, range, project, filters));
});

apiRoutes.patch('/workspace', async (req, res) => {
  const { currency, acknowledge } = z
    .object({ currency: z.enum(currencies), acknowledge: z.boolean().optional() })
    .parse(req.body);
  const previous = await Workspace.findOne({ user: req.user.id }).lean();
  if (
    currency !== (previous?.currency || 'USD') &&
    !acknowledge &&
    ((await Expense.exists({ user: req.user.id })) || (await Project.exists({ user: req.user.id })))
  )
    fail(
      400,
      'Confirm that existing amounts keep their values. Currency changes do not convert money.',
    );
  await Workspace.findOneAndUpdate(
    { user: req.user.id },
    { currency },
    { upsert: true, runValidators: true },
  );
  res.json({ name: 'My workspace', currency });
});

apiRoutes.post('/projects', async (req, res) => {
  const { budget = 0, revenue, ...data } = projectInput.parse(req.body);
  res.status(201).json(
    await Project.create({
      ...data,
      budgetMinor: moneyMinor(budget),
      revenueMinor: revenue == null ? null : moneyMinor(revenue),
      user: req.user.id,
    }),
  );
});
apiRoutes.patch('/projects/:id', async (req, res) => {
  const { budget, revenue, ...data } = projectInput.partial().parse(req.body);
  if (budget !== undefined) data.budgetMinor = moneyMinor(budget);
  if (revenue !== undefined) data.revenueMinor = revenue === null ? null : moneyMinor(revenue);
  const project = await Project.findOneAndUpdate(
    { _id: parseId(req.params.id), user: req.user.id },
    data,
    { new: true, runValidators: true },
  );
  if (!project) fail(404, 'Project not found.');
  res.json(project);
});
apiRoutes.delete('/projects/:id', async (req, res) => {
  const _id = parseId(req.params.id),
    user = req.user.id;
  if ((await Task.exists({ project: _id, user })) || (await Expense.exists({ project: _id, user })))
    fail(409, 'Move or remove linked tasks and expenses before deleting this project.');
  if (!(await Project.findOneAndDelete({ _id, user }))) fail(404, 'Project not found.');
  res.status(204).end();
});

apiRoutes.post('/tasks', async (req, res) => {
  const data = taskInput.parse(req.body);
  await checkProject(req.user.id, data.project);
  res.status(201).json(
    await Task.create({
      ...data,
      completed: data.status === 'done',
      user: req.user.id,
    }),
  );
});
apiRoutes.post('/tasks/batch', async (req, res) => {
  const tasks = z.array(taskInput).min(1).max(20).parse(req.body.tasks);
  for (const task of tasks) await checkProject(req.user.id, task.project);
  res.status(201).json(
    await Task.insertMany(
      tasks.map((t) => ({
        ...t,
        user: req.user.id,
        completed: t.status === 'done',
      })),
    ),
  );
});
apiRoutes.patch('/tasks/:id', async (req, res) => {
  const data = taskInput.partial().parse(req.body);
  await checkProject(req.user.id, data.project);
  if (data.status) data.completed = data.status === 'done';
  const task = await Task.findOneAndUpdate(
    { _id: parseId(req.params.id), user: req.user.id },
    data,
    { new: true, runValidators: true },
  );
  if (!task) fail(404, 'Task not found.');
  res.json(task);
});
apiRoutes.delete('/tasks/:id', async (req, res) => {
  if (
    !(await Task.findOneAndDelete({
      _id: parseId(req.params.id),
      user: req.user.id,
    }))
  )
    fail(404, 'Task not found.');
  res.status(204).end();
});

apiRoutes.post('/expenses', async (req, res) => {
  const data = expenseInput.parse(req.body);
  await checkProject(req.user.id, data.project);
  const settings = await Workspace.findOne({ user: req.user.id }).lean();
  res.status(201).json(
    await Expense.create({
      ...data,
      date: data.date || new Date(),
      amountMinor: moneyMinor(data.amount),
      currency: settings?.currency || 'USD',
      user: req.user.id,
    }),
  );
});
apiRoutes.patch('/expenses/:id', async (req, res) => {
  const data = expenseInput.partial().parse(req.body);
  await checkProject(req.user.id, data.project);
  if (data.amount !== undefined) data.amountMinor = moneyMinor(data.amount);
  const expense = await Expense.findOneAndUpdate(
    { _id: parseId(req.params.id), user: req.user.id },
    data,
    { new: true, runValidators: true },
  );
  if (!expense) fail(404, 'Expense not found.');
  res.json(expense);
});
apiRoutes.delete('/expenses/:id', async (req, res) => {
  if (
    !(await Expense.findOneAndDelete({
      _id: parseId(req.params.id),
      user: req.user.id,
    }))
  )
    fail(404, 'Expense not found.');
  res.status(204).end();
});

// Only these two lists need pagination. Dashboard totals always include every record.
apiRoutes.get('/tasks', async (req, res) => {
  const page = z.coerce.number().int().min(1).max(100000).default(1).parse(req.query.page);
  const { range, project } = reportFilters(req.query);
  res.json({
    items: await Task.find(recordScopes(req.user.id, range, project).tasks)
      .sort({ createdAt: -1 })
      .skip((page - 1) * 100)
      .limit(100),
  });
});
apiRoutes.get('/expenses', async (req, res) => {
  const page = z.coerce.number().int().min(1).max(100000).default(1).parse(req.query.page);
  const { range, project, ...filters } = reportFilters(req.query);
  const settings = await Workspace.findOne({ user: req.user.id }).lean();
  const items = await Expense.find(recordScopes(req.user.id, range, project, filters).expenses)
    .sort({ date: -1 })
    .skip((page - 1) * 100)
    .limit(100)
    .lean();
  res.json({
    items: items.map((e) => ({ ...e, currency: settings?.currency || 'USD' })),
  });
});

apiRoutes.get('/export/expenses', async (req, res) => {
  const { range, project, ...filters } = reportFilters(req.query);
  const settings = await Workspace.findOne({ user: req.user.id }).lean();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="edith-expenses.csv"');
  res.write(
    '\uFEFF' +
      csvRow([
        'Title',
        'Amount',
        'Currency',
        'Category',
        'Merchant',
        'Date',
        'Billable',
        'Project',
        'Notes',
      ]),
  );
  const projects = await Project.find({ user: req.user.id }).lean();
  for await (const e of Expense.find(recordScopes(req.user.id, range, project, filters).expenses)
    .sort({ date: -1 })
    .cursor()) {
    res.write(
      csvRow([
        e.title,
        e.amountMinor / 100,
        settings?.currency || 'USD',
        e.category,
        e.merchant,
        e.date.toISOString().slice(0, 10),
        e.billable,
        projects.find((p) => String(p._id) === String(e.project))?.name || '',
        e.notes,
      ]),
    );
  }
  res.end();
});

apiRoutes.get('/export/report', async (req, res) => {
  const { range, project, ...filters } = reportFilters(req.query);
  await checkProject(req.user.id, project);
  const scopes = recordScopes(req.user.id, range, project, filters);
  const snapshot = await overview(req.user.id, range, project, filters);
  const names = await Project.find({ user: req.user.id }).select('name').lean();
  const projectName = (id) => names.find((p) => String(p._id) === String(id))?.name || '';
  const currency = snapshot.workspace.currency;
  const recorded = snapshot.projects.filter((p) => p.revenueMinor != null);
  const revenue = recorded.reduce((sum, p) => sum + p.revenueMinor, 0);
  const costs = recorded.reduce((sum, p) => sum + p.spentMinor, 0);
  const date = (value) => (value ? new Date(value).toISOString() : '');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="edith-report.csv"');
  res.write('\uFEFF' + csvRow(reportColumns));
  for (const [Title, Value] of Object.entries({
    'From (inclusive)': req.query.from || 'All time',
    'To (inclusive)': req.query.to || 'All time',
    'Project filter': project ? projectName(project) : 'All projects',
    'Date basis':
      'Projects/tasks: created date; expenses: transaction date. Project finances are all-time for projects in the range.',
    'Exported at': new Date().toISOString(),
    Tasks: snapshot.stats.totalTasks,
    'Completed tasks': snapshot.stats.completedTasks,
    'Overdue tasks': snapshot.stats.overdueTasks,
    Expenses: snapshot.stats.totalExpenses,
    'Period spending': snapshot.stats.totalSpentMinor / 100,
    Projects: snapshot.projects.length,
    'Project budgets (all-time)': snapshot.stats.totalBudgetMinor / 100,
    'Projects with recorded revenue': recorded.length,
    'Recorded revenue (all-time)': recorded.length ? revenue / 100 : '',
    'Linked costs for revenue projects (all-time)': recorded.length ? costs / 100 : '',
    'Net profit/loss (all-time)': recorded.length ? (revenue - costs) / 100 : '',
  }))
    res.write(reportRow({ Section: 'Summary', Title, Value, Currency: currency }));
  for (const p of snapshot.projects)
    res.write(
      reportRow({
        Section: 'Project',
        ID: p._id,
        Project: p.name,
        Title: p.name,
        Description: p.description,
        Client: p.client,
        Status: p.status,
        Created: date(p.createdAt),
        Due: date(p.dueDate),
        Currency: currency,
        Budget: p.budgetMinor / 100,
        Revenue: p.revenueMinor == null ? '' : p.revenueMinor / 100,
        Spent: p.spentMinor / 100,
        Remaining: (p.budgetMinor - p.spentMinor) / 100,
        ProfitLoss: p.profitMinor == null ? '' : p.profitMinor / 100,
        TotalTasks: p.taskCount,
        CompletedTasks: p.doneCount,
        Color: p.color,
      }),
    );
  for await (const t of Task.find(scopes.tasks).sort({ createdAt: -1 }).cursor())
    res.write(
      reportRow({
        Section: 'Task',
        ID: t._id,
        Project: projectName(t.project),
        Title: t.title,
        Description: t.description,
        Status: t.status,
        Priority: t.priority,
        Created: date(t.createdAt),
        Due: date(t.dueDate),
      }),
    );
  for await (const e of Expense.find(scopes.expenses).sort({ date: -1 }).cursor())
    res.write(
      reportRow({
        Section: 'Expense',
        ID: e._id,
        Project: projectName(e.project),
        Title: e.title,
        Amount: e.amountMinor / 100,
        Currency: currency,
        Category: e.category,
        Merchant: e.merchant,
        Billable: e.billable,
        Notes: e.notes,
        Date: date(e.date),
        Created: date(e.createdAt),
      }),
    );
  res.end();
});
