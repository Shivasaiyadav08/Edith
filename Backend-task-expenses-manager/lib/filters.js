import mongoose from 'mongoose';
import { z } from 'zod';
import { fail, parseId } from './validation.js';

export function reportFilters(query = {}) {
  const day = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((v) => {
      const d = new Date(v);
      return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
    }, 'Invalid date');
  const from = query.from ? day.parse(query.from) : '';
  const to = query.to ? day.parse(query.to) : '';
  if (from && to && from > to) fail(400, 'End date must be on or after the start date.');
  return {
    range: {
      ...(from ? { $gte: new Date(from) } : {}),
      ...(to ? { $lt: new Date(new Date(to).getTime() + 86400000) } : {}),
    },
    project: query.project ? parseId(query.project) : undefined,
    category: query.category ? z.string().max(60).parse(query.category) : '',
    q: query.q ? z.string().trim().max(200).parse(query.q) : '',
  };
}

export function recordScopes(userId, range = {}, projectId, filters = {}) {
  const owner = { user: new mongoose.Types.ObjectId(userId) };
  const project = projectId ? new mongoose.Types.ObjectId(projectId) : undefined;
  const scope = { ...owner, ...(project ? { project } : {}) };
  const dated = Object.keys(range).length ? { createdAt: range } : {};
  const search = filters.q
    ? { $regex: filters.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
    : undefined;
  return {
    owner,
    scope,
    projects: { ...owner, ...(project ? { _id: project } : {}), ...dated },
    tasks: { ...scope, ...dated },
    expenses: {
      ...scope,
      ...(Object.keys(range).length ? { date: range } : {}),
      ...(filters.category ? { category: filters.category } : {}),
      ...(search ? { $or: [{ title: search }, { merchant: search }] } : {}),
    },
  };
}
