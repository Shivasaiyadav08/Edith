import Task from '../models/Task.js';
import Expense from '../models/Expense.js';
import Project from '../models/Project.js';
import AiUsage from '../models/AiUsage.js';
import { monthKey } from './validation.js';
import { recordScopes } from './filters.js';
import Workspace from '../models/Workspace.js';

// MongoDB aggregation does not cast strings to ObjectId, so convert the user ID here.
export async function overview(userId, range = {}, projectId, filters = {}) {
  const scopes = recordScopes(userId, range, projectId, filters);
  const { scope, expenses: expenseScope } = scopes;
  const settings = await Workspace.findOne({ user: userId }).lean();
  const currency = settings?.currency || 'USD';
  const [tasks, expenses, projects, taskCounts, categories, spending, trend, usage] =
    await Promise.all([
      Task.find(scopes.tasks).sort({ createdAt: -1 }).limit(100).lean(),
      Expense.find(expenseScope).sort({ date: -1 }).limit(100).lean(),
      Project.find(scopes.projects).sort({ createdAt: -1 }).lean(),
      Task.aggregate([
        { $match: scopes.tasks },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Expense.aggregate([
        { $match: expenseScope },
        {
          $group: {
            _id: '$category',
            amountMinor: { $sum: '$amountMinor' },
            count: { $sum: 1 },
          },
        },
      ]),
      Expense.aggregate([
        { $match: scope },
        { $group: { _id: '$project', amountMinor: { $sum: '$amountMinor' } } },
      ]),
      Expense.aggregate([
        { $match: expenseScope },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
            amountMinor: { $sum: '$amountMinor' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      AiUsage.findOne({ user: userId, month: monthKey() }).lean(),
    ]);
  const counts = await Task.aggregate([
    { $match: scopes.tasks },
    {
      $group: {
        _id: '$project',
        total: { $sum: 1 },
        done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
      },
    },
  ]);
  return {
    workspace: { name: 'My workspace', currency },
    tasks,
    expenses: expenses.map((e) => ({ ...e, currency })),
    projects: projects.map((p) => ({
      ...p,
      revenueMinor: p.revenueMinor ?? null,
      budgetStatus: !p.budgetMinor
        ? 'not-set'
        : (spending.find((s) => String(s._id) === String(p._id))?.amountMinor || 0) > p.budgetMinor
          ? 'over-budget'
          : 'within-budget',
      profitMinor:
        p.revenueMinor == null
          ? null
          : p.revenueMinor -
            (spending.find((s) => String(s._id) === String(p._id))?.amountMinor || 0),
      spentMinor: spending.find((s) => String(s._id) === String(p._id))?.amountMinor || 0,
      taskCount: counts.find((t) => String(t._id) === String(p._id))?.total || 0,
      doneCount: counts.find((t) => String(t._id) === String(p._id))?.done || 0,
    })),
    stats: {
      totalTasks: taskCounts.reduce((s, t) => s + t.count, 0),
      completedTasks: taskCounts.find((t) => t._id === 'done')?.count || 0,
      overdueTasks: await Task.countDocuments({
        ...scopes.tasks,
        status: { $ne: 'done' },
        dueDate: { $lt: new Date(), $ne: null },
      }),
      totalExpenses: categories.reduce((s, e) => s + e.count, 0),
      totalSpentMinor: categories.reduce((s, e) => s + e.amountMinor, 0),
      totalBudgetMinor: projects.reduce((s, p) => s + p.budgetMinor, 0),
      categories,
      trend,
    },
    usage: { requests: usage?.requests || 0, limit: 20 },
  };
}
