import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api, errorMessage } from '../lib/api';
import { demoMutate, demoWorkspace, readDemo } from '../lib/demo';
import { AppContext } from '../lib/workspace-context';
import type { AppContextValue } from '../lib/workspace-context';
import type { Config, Expense, Snapshot, Task, Workspace } from '../lib/types';
import AssistantWidget from './AssistantWidget';

// One shared provider keeps the dashboard in sync after a task or expense changes.
export default function WorkspaceProvider({
  children,
  demo,
  user,
}: {
  children: ReactNode;
  demo: boolean;
  user: AppContextValue['user'];
}) {
  const [data, setData] = useState<Snapshot | null>(() => (demo ? readDemo() : null));
  const [config, setConfig] = useState<Config>({
    google: false,
    email: false,
    ai: false,
  });
  const [loading, setLoading] = useState(!demo);
  const [error, setError] = useState('');
  const [toast, notify] = useState('');
  const [assistant, setAssistant] = useState<{ mode: string; prompt: string } | null>(null);
  const workspace = data?.workspace || {
    ...demoWorkspace,
    name: demo ? 'Studio workspace' : 'My workspace',
  };

  const refresh = useCallback(async () => {
    setError('');
    try {
      setData(demo ? readDemo() : await api<Snapshot>('/overview'));
    } catch (err) {
      setError(errorMessage(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [demo]);
  useEffect(() => {
    void refresh().catch(() => {});
  }, [refresh]);
  useEffect(() => {
    if (demo) return;
    api<Config>('/config')
      .then(setConfig)
      .catch(() => {});
  }, [demo]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => notify(''), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const mutate: AppContextValue['mutate'] = async (resource, body, id, remove) => {
    if (demo) setData(demoMutate(resource, body, id, remove));
    else {
      await api(`/${resource}${id ? `/${id}` : ''}`, {
        method: remove ? 'DELETE' : id ? 'PATCH' : 'POST',
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      await refresh().catch(() => {});
    }
    notify(remove ? 'Item deleted.' : id ? 'Changes saved.' : 'Added to your workspace.');
  };
  const request: AppContextValue['request'] = useCallback(
    async <T,>(path: string, body?: unknown, method = 'POST') => {
      if (demo) throw new Error('Create an account to use live AI and account settings.');
      return api<T>(path, {
        method,
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    },
    [demo],
  );
  const loadMore = async (resource: 'tasks' | 'expenses') => {
    if (!data || demo) return;
    const page = Math.floor(data[resource].length / 100) + 1;
    const result = await api<{ items: (Task | Expense)[] }>(`/${resource}?page=${page}`);
    setData((prev) =>
      prev ? { ...prev, [resource]: [...prev[resource], ...result.items] } : prev,
    );
  };
  return (
    <AppContext.Provider
      value={{
        demo,
        user,
        workspace,
        data,
        config,
        loading,
        error,
        toast,
        notify,
        refresh,
        setCurrency: async (currency, acknowledge) => {
          if (demo) {
            const next = { ...readDemo(), workspace: { ...workspace, currency } };
            localStorage.setItem('forma-demo-v1', JSON.stringify(next));
            setData(next);
          } else {
            const saved = await api<Workspace>('/workspace', {
              method: 'PATCH',
              body: JSON.stringify({ currency, acknowledge }),
            });
            // Apply the confirmed server response immediately, including open forms.
            setData((prev) =>
              prev
                ? {
                    ...prev,
                    workspace: saved,
                    expenses: prev.expenses.map((expense) => ({
                      ...expense,
                      currency: saved.currency,
                    })),
                  }
                : prev,
            );
          }
          notify('Workspace currency updated. Amounts were not converted.');
        },
        mutate,
        request,
        loadMore,
        prefix: demo ? '/demo' : '',
        assistant,
        openAssistant: (mode = 'ask', prompt = '') => setAssistant({ mode, prompt }),
        closeAssistant: () => setAssistant(null),
      }}
    >
      {children}
      <AssistantWidget />
    </AppContext.Provider>
  );
}
