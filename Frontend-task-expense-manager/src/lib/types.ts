export type Status = 'todo' | 'in-progress' | 'done';
export type Priority = 'low' | 'medium' | 'high';
export interface Workspace {
  name: string;
  currency: string;
}
export interface Project {
  createdAt?: string;
  _id: string;
  name: string;
  description: string;
  client: string;
  budgetMinor: number;
  revenueMinor?: number | null;
  spentMinor: number;
  taskCount: number;
  doneCount: number;
  color: string;
  dueDate: string | null;
  status: 'active' | 'completed' | 'on-hold';
}
export interface Task {
  _id: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  project: string | null;
  dueDate: string | null;
  createdAt: string;
}
export interface Expense {
  createdAt?: string;
  _id: string;
  title: string;
  amount: number;
  amountMinor: number;
  category: string;
  currency: string;
  merchant: string;
  date: string;
  project: string | null;
  billable: boolean;
  notes: string;
}
export interface Snapshot {
  workspace?: Workspace;
  projects: Project[];
  tasks: Task[];
  expenses: Expense[];
  stats: {
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    totalExpenses: number;
    totalSpentMinor: number;
    totalBudgetMinor: number;
    categories: { _id: string; amountMinor: number; count: number }[];
    trend: { _id: string; amountMinor: number }[];
  };
  usage: { requests: number; limit: number };
}
export interface Config {
  authOrigin?: string;
  google: boolean;
  email: boolean;
  ai: boolean;
}
export interface DraftTask {
  title: string;
  description: string;
  priority: Priority;
}
export interface DraftExpense {
  title: string;
  amount: number;
  currency: string;
  category: string;
  merchant: string;
  date: string | null;
  notes: string;
}
export type Resource = 'tasks' | 'expenses' | 'projects';
export const currencies = ['USD', 'INR', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD', 'AED'];
export const money = (minor: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(minor / 100);
export const shortDate = (date: string | null) =>
  date
    ? new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : 'No due date';
export const statusLabel = (status: string) =>
  ({
    todo: 'To do',
    'in-progress': 'In progress',
    done: 'Done',
    active: 'Active',
    completed: 'Completed',
    'on-hold': 'On hold',
  })[status] || status;
