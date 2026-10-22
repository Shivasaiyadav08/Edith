// Auth, CORS, and API writes must agree on the same exact origins.
export function originSettings() {
  const authURL = process.env.BETTER_AUTH_URL || 'http://localhost:5173';
  const origins = new Set([
    new URL(authURL).origin,
    new URL(process.env.FRONTEND_URL || 'http://localhost:5173').origin,
  ]);
  const local =
    process.env.NODE_ENV !== 'production' &&
    [...origins].every((origin) => {
      const url = new URL(origin);
      return url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
    });
  if (local) {
    for (const origin of [...origins]) {
      const url = new URL(origin);
      url.hostname = url.hostname === 'localhost' ? '127.0.0.1' : 'localhost';
      origins.add(url.origin);
    }
  }
  return {
    origins: [...origins],
    baseURL: local
      ? {
          allowedHosts: [...origins].map((origin) => new URL(origin).host),
          protocol: 'http',
          fallback: authURL,
        }
      : authURL,
  };
}
