import { createHash, randomBytes } from 'node:crypto';
import type { CurrentUserView } from '@claimsense/shared';
import type { NextFunction, Request, Response } from 'express';
import type { Types } from 'mongoose';
import { fail } from './errors';
import { Session, User } from './models';

export const SESSION_COOKIE = 'cs_session';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** The signed-in user or guest for this request, set by `loadUser`; null when there is no valid session. */
      user?: CurrentUserView | null;
    }
  }
}

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

const tokenOf = (req: Request): string | undefined => {
  const v = (req.cookies as Record<string, unknown> | undefined)?.[SESSION_COOKIE];
  return typeof v === 'string' && v ? v : undefined;
};

/** Resolves the session cookie to a user. Never creates or refreshes a session (GET stays side-effect free). */
export const loadUser = (req: Request, _res: Response, next: NextFunction) => {
  const token = tokenOf(req);
  if (!token) {
    req.user = null;
    return next();
  }
  void (async () => {
    const session = await Session.findOne({ tokenHash: sha256(token), expiresAt: { $gt: new Date() } }).lean();
    const user = session ? await User.findById(session.userId).lean() : null;
    req.user = user ? { id: String(user._id), isGuest: user.isGuest, email: user.email ?? null, displayName: user.displayName ?? null } : null;
  })().then(() => next(), next);
};

export const requireUser = (req: Request): CurrentUserView => req.user ?? fail('AUTH_REQUIRED');

/** Starting and ending the cookie session, handed to services so they never touch req/res themselves. */
export interface SessionPort {
  start(userId: Types.ObjectId, ttlMs: number): Promise<void>;
  end(): Promise<void>;
}

/** A random 32-byte token goes in the cookie; only its SHA-256 is stored (ADR-004). */
export const sessionPort = (req: Request, res: Response): SessionPort => ({
  async start(userId, ttlMs) {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + ttlMs);
    await Session.create({ tokenHash: sha256(token), userId, expiresAt });
    res.cookie(SESSION_COOKIE, token, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', expires: expiresAt });
  },
  async end() {
    const token = tokenOf(req);
    if (!token) return;
    await Session.deleteOne({ tokenHash: sha256(token) });
    res.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
  },
});
