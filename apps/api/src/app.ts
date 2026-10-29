import cookieParser from 'cookie-parser';
import express, { type NextFunction, type Request, type Response, type Router } from 'express';
import helmet from 'helmet';
import { connectDb } from './core/db';
import { env } from './core/env';
import { logInternal, sendError } from './core/http';
import { requestLog } from './core/logger';
import { sameOriginWrites } from './core/origin';
import { loadUser } from './core/session';
import { authRoutes } from './modules/auth/auth.routes';
import { claimsRoutes, meRoutes } from './modules/claims/claims.routes';
import { estimateRoutes } from './modules/estimate/estimate.routes';
import { extractionRoutes } from './modules/extraction/extraction.routes';
import { factsRoutes } from './modules/facts/facts.routes';
import { plansRoutes } from './modules/plans/plans.routes';
import { samplesRoutes } from './modules/samples/samples.routes';

/** `trust proxy` from TRUST_PROXY: 'true' / 'false', a hop count, or names such as 'loopback'. */
const trustProxy = (v: string): boolean | number | string => (v === 'true' ? true : v === 'false' ? false : /^\d+$/.test(v) ? Number(v) : v);

/** Mounts a module router, remembering its path pattern for the request log (never the real ids). */
const mount = (app: express.Express, pattern: string, router: Router) =>
  app.use(pattern, (_req: Request, res: Response, next: NextFunction) => {
    res.locals.base = pattern;
    next();
  }, router);

export const createApp = () => {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', trustProxy(env().TRUST_PROXY));
  app.use(helmet());
  app.use(requestLog);
  app.get('/healthz', (_req, res) => {
    res.locals.route = '/healthz';
    res.json({ ok: true });
  });

  app.use('/api', sameOriginWrites, express.json({ limit: '100kb' }), cookieParser(), (_req, _res, next) => void connectDb().then(() => next(), next), loadUser);
  mount(app, '/api/auth', authRoutes);
  mount(app, '/api/samples', samplesRoutes);
  mount(app, '/api/plans', plansRoutes);
  mount(app, '/api/me', meRoutes);
  mount(app, '/api/claims/:claimId/facts', factsRoutes);
  mount(app, '/api/claims/:claimId', estimateRoutes);
  mount(app, '/api/claims/:claimId', extractionRoutes);
  mount(app, '/api/claims', claimsRoutes);

  app.use((_req: Request, res: Response) => sendError(res, 'NOT_FOUND'));
  // Malformed JSON and anything unexpected: a code, never a stack or message (golden rule 6).
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof SyntaxError || (typeof err === 'object' && err !== null && 'type' in err && err.type === 'entity.parse.failed')) return sendError(res, 'VALIDATION_FAILED');
    if (typeof err === 'object' && err !== null && 'type' in err && err.type === 'entity.too.large') return sendError(res, 'VALIDATION_FAILED');
    logInternal('request', err);
    sendError(res, 'INTERNAL_ERROR');
  });
  return app;
};
