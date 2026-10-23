import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { clerkMiddleware } from '@clerk/express';
import { ZodError } from 'zod';
import { requireAuth } from './middleware/auth.js';
import { apiRoutes } from './routes/api.js';
import { aiRoutes } from './routes/ai.js';
import { originSettings } from './lib/origins.js';
import { mountFrontend } from './lib/frontend.js';

export function createApp(dependencies = {}) {
  const app = express();
  const { origins } = originSettings();
  app.locals.aiGenerate = dependencies.generate;
  app.disable('x-powered-by');
  if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: origins, credentials: true }));
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.get('/api/config', (req, res) =>
    res.json({
      ai: !!process.env.GEMINI_API_KEY?.trim(),
    }),
  );
  app.use('/api', dependencies.authenticate || clerkMiddleware({ authorizedParties: origins }));
  app.use(express.json({ limit: '7mb' }));
  app.use('/api', (req, res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !origins.includes(req.headers.origin))
      return res.status(403).json({ message: 'Request origin is not allowed.' });
    next();
  });
  app.use(
    '/api',
    rateLimit({
      windowMs: 60000,
      limit: 200,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { message: 'Too many requests. Try again in a minute.' },
    }),
    requireAuth,
  );
  app.use(
    '/api/ai',
    rateLimit({
      windowMs: 60000,
      limit: 10,
      message: {
        message: 'Please wait a minute before making another AI request.',
      },
    }),
    aiRoutes,
  );
  app.use('/api', apiRoutes);
  app.use('/api', (req, res) => res.status(404).json({ message: 'Endpoint not found.' }));
  if (process.env.NODE_ENV === 'production') mountFrontend(app);
  app.use((req, res) => res.status(404).json({ message: 'Endpoint not found.' }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const validation = error instanceof ZodError;
    const status =
      validation || error.name === 'CastError' || error.type === 'entity.parse.failed'
        ? 400
        : error.status || (error.code === 11000 ? 409 : 500);
    if (status >= 500) console.error('Request failed:', req.method, req.path, error.name);
    res.status(status).json({
      message: validation
        ? error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
        : status >= 500 && !error.status
          ? 'Something went wrong. Please try again.'
          : error.message,
    });
  });
  return app;
}
