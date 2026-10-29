import type { NextFunction, Request, Response } from 'express';

/**
 * One line per request: method, route pattern, status, duration. Never the URL, query, body or ids
 * (golden rule 6): the route pattern (`/api/claims/:claimId/facts`) is recorded by `handler`.
 */
export const requestLog = (req: Request, res: Response, next: NextFunction) => {
  const start = performance.now();
  res.on('finish', () => {
    const route = typeof res.locals.route === 'string' ? res.locals.route : 'unmatched';
    console.info(`[http] ${req.method} ${route} ${res.statusCode} ${Math.round(performance.now() - start)}ms`);
  });
  next();
};
