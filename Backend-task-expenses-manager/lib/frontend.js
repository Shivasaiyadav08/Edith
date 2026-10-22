import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const frontendDist = fileURLToPath(
  new URL('../../Frontend-task-expense-manager/dist/', import.meta.url),
);

// In production one Express service serves both the built app and /api.
export function mountFrontend(app, directory = frontendDist) {
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
}
