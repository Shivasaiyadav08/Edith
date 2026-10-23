export function originSettings() {
  const url = new URL(process.env.FRONTEND_URL || 'http://localhost:5173');
  const origins = [url.origin];
  if (
    process.env.NODE_ENV !== 'production' &&
    url.protocol === 'http:' &&
    ['localhost', '127.0.0.1'].includes(url.hostname)
  ) {
    url.hostname = url.hostname === 'localhost' ? '127.0.0.1' : 'localhost';
    origins.push(url.origin);
  }
  return { origins };
}
