import { useEffect, useState } from 'react';
import { useWorkspace } from './workspace-context';
import { recalculate } from './demo';
import type { Expense, Snapshot, Task } from './types';
import { errorMessage } from './api';

export default function useReport(project: string, from = '', to = '', category = '', q = '') {
  const { data, demo, request, loadMore: more } = useWorkspace();
  const query = new URLSearchParams(
    Object.entries({ project, from, to, category, q }).filter(([, v]) => v),
  ).toString();
  const [result, setResult] = useState<{
    key: string;
    data: Snapshot | null;
    busy: boolean;
    error: string;
  }>({ key: '', data: null, busy: false, error: '' });
  useEffect(() => {
    let current = true;
    async function load() {
      if (!data) return;
      setResult({ key: query, data: null, busy: true, error: '' });
      try {
        let snapshot: Snapshot;
        if (demo) {
          const within = (value?: string) =>
            (!from && !to) ||
            (!!value && (!from || value.slice(0, 10) >= from) && (!to || value.slice(0, 10) <= to));
          const projects = data.projects.filter(
            (p) => (!project || p._id === project) && within(p.createdAt),
          );
          snapshot = recalculate({
            ...data,
            projects,
            tasks: data.tasks.filter(
              (t) => (!project || t.project === project) && within(t.createdAt),
            ),
            expenses: data.expenses.filter(
              (e) =>
                (!project || e.project === project) &&
                within(e.date) &&
                (!category || e.category === category) &&
                (e.title + ' ' + e.merchant).toLowerCase().includes(q.toLowerCase()),
            ),
          });
          snapshot.projects = snapshot.projects.map((p) => ({
            ...p,
            spentMinor: projects.find((original) => original._id === p._id)?.spentMinor || 0,
          })); // Finances remain all-time; task counts follow the date filter.
        } else snapshot = await request<Snapshot>('/overview?' + query, undefined, 'GET');
        if (current) setResult({ key: query, data: snapshot, busy: false, error: '' });
      } catch (error) {
        if (current) setResult({ key: query, data: null, busy: false, error: errorMessage(error) });
      }
    }
    const timer = query ? window.setTimeout(() => void load(), q ? 200 : 0) : undefined;
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [data, demo, request, project, from, to, category, q, query]);
  const active = query
    ? result.key === query
      ? result
      : { data: null, busy: true, error: '' }
    : { data, busy: false, error: '' };
  return {
    ...active,
    query,
    loadMore: async (resource: 'tasks' | 'expenses') => {
      if (!query) return more(resource);
      if (!active.data || demo) return;
      const page = Math.floor(active.data[resource].length / 100) + 1;
      const next = await request<{ items: (Task | Expense)[] }>(
        '/' + resource + '?' + query + '&page=' + page,
        undefined,
        'GET',
      );
      setResult((prev) =>
        prev.key === query && prev.data
          ? { ...prev, data: { ...prev.data, [resource]: [...prev.data[resource], ...next.items] } }
          : prev,
      );
    },
  };
}
