import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { env } from './env';

/**
 * The client IP for per-IP limits. Browsers reach the API through the web app's proxy, which sees the real
 * client and sends it in X-CS-Client-IP with the shared PROXY_SECRET. That header counts only when the key
 * matches; otherwise (no secret, wrong key, a direct caller) it is `req.ip`, which never trusts a client-sent
 * X-Forwarded-For unless TRUST_PROXY says so.
 */
export const clientIp = (req: Request): string => {
  const secret = (env() as ReturnType<typeof env> & { PROXY_SECRET?: string }).PROXY_SECRET;
  const key = req.get('x-cs-proxy-key');
  const vouched = req.get('x-cs-client-ip');
  if (secret && key && vouched && key.length === secret.length && timingSafeEqual(Buffer.from(key), Buffer.from(secret))) {
    return vouched.slice(0, 64);
  }
  return req.ip ?? 'unknown';
};
