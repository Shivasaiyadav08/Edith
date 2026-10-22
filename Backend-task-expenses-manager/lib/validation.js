import { z } from 'zod';
export const id = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid record ID');
const date = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date')
  .nullable()
  .optional();
const project = id.nullable().optional();
export const taskInput = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).optional(),
  project,
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['todo', 'in-progress', 'done']).optional(),
  dueDate: date,
});
export const expenseInput = z.object({
  title: z.string().trim().min(1).max(200),
  amount: z
    .number()
    .finite()
    .min(0)
    .max(100000000)
    .refine(
      (v) => Math.abs(v * 100 - Math.round(v * 100)) < 0.00001,
      'Use at most two decimal places',
    ),
  category: z.string().trim().min(1).max(60),
  project,
  date: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date')
    .optional(),
  merchant: z.string().max(200).optional(),
  billable: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});
export const projectInput = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().max(3000).optional(),
  client: z.string().max(150).optional(),
  budget: z.number().finite().min(0).max(100000000).optional(),
  revenue: expenseInput.shape.amount.nullable().optional(),
  dueDate: date,
  color: z.enum(['violet', 'blue', 'green', 'orange']).optional(),
  status: z.enum(['active', 'completed', 'on-hold']).optional(),
});
export const fail = (status, message) => {
  throw Object.assign(new Error(message), { status });
};
export const parseId = (value) => id.parse(value);
export const monthKey = () => new Date().toISOString().slice(0, 7);
export const moneyMinor = (value) => Math.round(value * 100);
