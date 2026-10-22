import { createContext, useContext } from 'react';
import type { Config, Resource, Snapshot, Workspace } from './types';

export interface AppContextValue {
  demo: boolean;
  user: { id: string; name: string; email: string; emailVerified?: boolean };
  workspace: Workspace;
  data: Snapshot | null;
  config: Config;
  loading: boolean;
  error: string;
  toast: string;
  notify: (message: string) => void;
  refresh: () => Promise<void>;
  setCurrency: (currency: string, acknowledge: boolean) => Promise<void>;
  mutate: (
    resource: Resource,
    body?: Record<string, unknown>,
    id?: string,
    remove?: boolean,
  ) => Promise<void>;
  request: <T>(path: string, body?: unknown, method?: string) => Promise<T>;
  loadMore: (resource: 'tasks' | 'expenses') => Promise<void>;
  prefix: string;
  assistant: { mode: string; prompt: string } | null;
  openAssistant: (mode?: string, prompt?: string) => void;
  closeAssistant: () => void;
}
export const AppContext = createContext<AppContextValue | null>(null);
export function useWorkspace() {
  const context = useContext(AppContext);
  if (!context) throw new Error('App provider is missing');
  return context;
}
