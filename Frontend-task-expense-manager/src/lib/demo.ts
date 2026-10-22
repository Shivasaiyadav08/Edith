import type { Workspace, Snapshot, Task, Expense, Project, Resource } from './types';
const now = new Date();
const day = (offset: number) =>
  new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 12).toISOString();
export const demoWorkspace: Workspace = {
  name: 'Studio workspace',
  currency: 'USD',
};
const projectData: Project[] = [
  {
    _id: 'brand',
    name: 'Brand identity',
    client: 'Acme Studio',
    description:
      'A fresh identity for a new chapter. Strategy, visual language, and a considered brand system.',
    budgetMinor: 800000,
    revenueMinor: 1050000,
    spentMinor: 0,
    taskCount: 0,
    doneCount: 0,
    color: 'violet',
    dueDate: day(14),
    status: 'active',
  },
  {
    _id: 'website',
    name: 'Website redesign',
    client: 'Orbit Digital',
    description: 'An intuitive, thoughtful web experience from wireframe to launch.',
    budgetMinor: 500000,
    revenueMinor: 700000,
    spentMinor: 0,
    taskCount: 0,
    doneCount: 0,
    color: 'green',
    dueDate: day(21),
    status: 'active',
  },
  {
    _id: 'launch',
    name: 'Product launch',
    client: 'Internal',
    description: 'Everything we need to put our next big idea into the world.',
    budgetMinor: 200000,
    spentMinor: 0,
    taskCount: 0,
    doneCount: 0,
    color: 'orange',
    dueDate: day(30),
    status: 'active',
  },
];
const titles = [
  'Explore visual directions',
  'Build the component library',
  'Review homepage wireframes',
  'Prepare launch checklist',
  'Finalize the color palette',
  'Send client proposal',
  'Design the logotype',
  'Audit current website',
];
const tasks: Task[] = titles.map((title, i) => ({
  _id: `task-${i}`,
  title,
  description: [
    'Explore three distinct creative directions and bring the strongest concepts to the team.',
    'Keep the details intentional and document decisions for the next review.',
  ][i % 2],
  status: i > 5 ? 'done' : i % 3 === 1 ? 'in-progress' : 'todo',
  priority: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
  project: projectData[i % 3]._id,
  dueDate: day(i - 1),
  createdAt: day(-i),
}));
const expenses: Expense[] = [
  {
    _id: 'e1',
    title: 'Design software subscription',
    amount: 49,
    amountMinor: 4900,
    currency: 'USD',
    category: 'Software',
    merchant: 'Figma',
    date: day(-1),
    project: 'brand',
    billable: false,
    notes: '',
  },
  {
    _id: 'e2',
    title: 'Brand photography',
    amount: 1250,
    amountMinor: 125000,
    currency: 'USD',
    category: 'Creative',
    merchant: 'Studio North',
    date: day(-2),
    project: 'brand',
    billable: true,
    notes: '',
  },
  {
    _id: 'e3',
    title: 'Cloud hosting',
    amount: 120,
    amountMinor: 12000,
    currency: 'USD',
    category: 'Infrastructure',
    merchant: 'Cloud provider',
    date: day(-3),
    project: 'website',
    billable: false,
    notes: '',
  },
  {
    _id: 'e4',
    title: 'Team working lunch',
    amount: 86,
    amountMinor: 8600,
    currency: 'USD',
    category: 'Meals',
    merchant: 'Sunday Kitchen',
    date: day(-4),
    project: 'launch',
    billable: false,
    notes: '',
  },
  {
    _id: 'e5',
    title: 'Development support',
    amount: 1800,
    amountMinor: 180000,
    currency: 'USD',
    category: 'Contractors',
    merchant: 'Independent developer',
    date: day(-8),
    project: 'website',
    billable: true,
    notes: '',
  },
  {
    _id: 'e6',
    title: 'Launch illustrations',
    amount: 600,
    amountMinor: 60000,
    currency: 'USD',
    category: 'Creative',
    merchant: 'Freelance illustrator',
    date: day(-12),
    project: 'launch',
    billable: true,
    notes: '',
  },
];
const fresh = (): Snapshot => ({
  projects: projectData.map((p) => ({ ...p, createdAt: day(-20) })),
  tasks,
  expenses,
  stats: {
    totalTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    totalExpenses: 0,
    totalSpentMinor: 0,
    totalBudgetMinor: 0,
    categories: [],
    trend: [],
  },
  usage: { requests: 0, limit: 20 },
});
export function recalculate(data: Snapshot): Snapshot {
  const categories = [...new Set(data.expenses.map((e) => e.category))].map((_id) => ({
    _id,
    amountMinor: data.expenses
      .filter((e) => e.category === _id)
      .reduce((s, e) => s + e.amountMinor, 0),
    count: data.expenses.filter((e) => e.category === _id).length,
  }));
  const trend = [...new Set(data.expenses.map((e) => e.date.slice(0, 7)))].sort().map((_id) => ({
    _id,
    amountMinor: data.expenses
      .filter((e) => e.date.startsWith(_id))
      .reduce((s, e) => s + e.amountMinor, 0),
  }));
  return {
    ...data,
    projects: data.projects.map((p) => ({
      ...p,
      spentMinor: data.expenses
        .filter((e) => e.project === p._id)
        .reduce((s, e) => s + e.amountMinor, 0),
      taskCount: data.tasks.filter((t) => t.project === p._id).length,
      doneCount: data.tasks.filter((t) => t.project === p._id && t.status === 'done').length,
    })),
    stats: {
      totalTasks: data.tasks.length,
      completedTasks: data.tasks.filter((t) => t.status === 'done').length,
      overdueTasks: data.tasks.filter(
        (t) => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date(),
      ).length,
      totalExpenses: data.expenses.length,
      totalSpentMinor: data.expenses.reduce((s, e) => s + e.amountMinor, 0),
      totalBudgetMinor: data.projects.reduce((s, p) => s + p.budgetMinor, 0),
      categories,
      trend,
    },
  };
}
export function readDemo(): Snapshot {
  try {
    const saved = localStorage.getItem('forma-demo-v1');
    const data: Snapshot = saved ? JSON.parse(saved) : fresh();
    return recalculate({
      ...data,
      projects: data.projects.map((p) => ({ ...p, createdAt: p.createdAt || day(-20) })),
    });
  } catch {
    return recalculate(fresh());
  }
}
export function demoMutate(
  resource: Resource,
  body?: Record<string, unknown>,
  id?: string,
  remove = false,
) {
  const data = readDemo();
  const records = data[resource] as unknown as Record<string, unknown>[];
  if (remove) (data[resource] as unknown[]) = records.filter((r) => r._id !== id);
  else if (id) {
    const item = records.find((r) => r._id === id);
    if (item) Object.assign(item, body);
  } else
    records.unshift({
      _id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      description: '',
      priority: 'medium',
      status: resource === 'projects' ? 'active' : 'todo',
      dueDate: null,
      project: null,
      notes: '',
      date: day(0),
      currency: 'USD',
      billable: false,
      color: 'violet',
      client: '',
      budgetMinor: 0,
      ...body,
    });
  if (body?.amount !== undefined) {
    const item = id ? records.find((r) => r._id === id) : records[0];
    if (item) item.amountMinor = Math.round(Number(body.amount) * 100);
  }
  if (body?.budget !== undefined) {
    const item = id ? records.find((r) => r._id === id) : records[0];
    if (item) item.budgetMinor = Math.round(Number(body.budget) * 100);
  }
  if (body?.revenue !== undefined) {
    const item = id ? records.find((r) => r._id === id) : records[0];
    if (item)
      item.revenueMinor = body.revenue === null ? null : Math.round(Number(body.revenue) * 100);
  }
  localStorage.setItem('forma-demo-v1', JSON.stringify(data));
  return recalculate(data);
}
