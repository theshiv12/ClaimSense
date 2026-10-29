import type { ErrorCode } from '@claimsense/shared';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { z } from 'zod';
import { ActionError, fail, STATUS } from './errors';

export const sendError = (res: Response, code: ErrorCode) => void res.status(STATUS[code]).json({ ok: false, code });

/** Logs the error class only: never facts, quotes, file names or messages (golden rule 6). */
export const logInternal = (where: string, err: unknown) => {
  const kind = err instanceof Error ? err.name : typeof err;
  console.error(`[api] ${where} failed: ${kind}`);
};

/**
 * A controller: returns the data for `{ ok: true, data }`, or throws ActionError for `{ ok: false, code }`.
 * Also records the route pattern for the request log, so ids never reach the log.
 */
export const handler =
  (name: string, fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req: Request, res: Response, _next: NextFunction) => {
    // The mount pattern (set in app.ts), never req.baseUrl: that holds real ids.
    const base = typeof res.locals.base === 'string' ? res.locals.base : '';
    const path = String((req.route as { path?: string } | undefined)?.path ?? '');
    res.locals.route = `${base}${path === '/' ? '' : path}` || '/';
    // Started inside a promise, so a synchronous throw (requireUser, parse) is handled the same way.
    Promise.resolve()
      .then(() => fn(req, res))
      .then((data) => void res.status(200).json({ ok: true, data: data ?? null }))
      .catch((err: unknown) => {
        if (err instanceof ActionError) return sendError(res, err.code);
        logInternal(name, err);
        sendError(res, 'INTERNAL_ERROR');
      });
  };

/** Zod at the boundary (golden rule 4): bad input is VALIDATION_FAILED, never a raw error. */
export const parse = <S extends z.ZodType>(schema: S, value: unknown): z.infer<S> => {
  const r = schema.safeParse(value);
  return r.success ? r.data : fail('VALIDATION_FAILED');
};
