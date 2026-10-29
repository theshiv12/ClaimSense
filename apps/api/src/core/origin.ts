import type { NextFunction, Request, Response } from 'express';
import { env } from './env';
import { sendError } from './http';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/** An origin as browsers send it: scheme, host and port, no path or trailing slash. */
export const webOrigin = (url: string) => new URL(url).origin;

/**
 * CSRF guard for writes (replaces Next's server-action origin check). The browser reaches the API only
 * through the web app's /api proxy, so a write must come from WEB_ORIGIN. `Origin: null` and
 * `Sec-Fetch-Site: cross-site` are refused. Requests with no Origin (server-to-server, curl) carry no
 * ambient browser cookies of another site, so they pass.
 * Refused writes are AUTH_REQUIRED: the closed ErrorCode set has no 403 code by design (TC-SH-05, golden rule 5).
 */
export const sameOriginWrites = (req: Request, res: Response, next: NextFunction) => {
  if (SAFE.has(req.method)) return next();
  const origin = req.get('origin');
  if (req.get('sec-fetch-site') === 'cross-site' || (origin !== undefined && origin !== env().WEB_ORIGIN)) return sendError(res, 'AUTH_REQUIRED');
  next();
};
