import { getToken } from '@clerk/react';

// Vite and Vercel proxy /api to Express; Clerk verifies the session token there.
const apiBase = '/api';
export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ? await getToken() : null;
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return fetch(`${apiBase}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, options);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Could not complete the request. Please try again.');
  }
  return res.status === 204 ? (undefined as T) : res.json();
}
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.';
