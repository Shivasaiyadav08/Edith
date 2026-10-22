import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

export const frontendDist = fileURLToPath(new URL('../../Frontend/dist/', import.meta.url));

// The API runs independently; serve the UI only when a frontend build is present.
export function mountFrontend(app, directory = frontendDist) {
  if (!existsSync(path.join(directory, 'index.html'))) return false;
  app.use(express.static(directory, { index: false }));
  app.get('/{*page}', (req, res, next) => {
    if (
      req.path === '/api' ||
      req.path.startsWith('/api/') ||
      path.extname(req.path) ||
      !req.accepts('html')
    )
      return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(directory, 'index.html'));
  });
  return true;
}
