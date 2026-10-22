import { createAuthClient } from 'better-auth/react';
import { emailOTPClient } from 'better-auth/client/plugins';
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_ORIGIN || window.location.origin,
  plugins: [emailOTPClient()],
});
export const apiBase = `${import.meta.env.VITE_API_ORIGIN || ''}/api`;
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Could not complete the request. Please try again.');
  }
  return res.status === 204 ? (undefined as T) : res.json();
}
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.';
