import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import { cookies } from 'next/headers';
import { Types } from 'mongoose';
import { connectDb } from './db';
import { env } from './env';
import { LoginAttempt, Session, User } from './models';

export const SESSION_COOKIE = 'cs_session';
const MAX_LOGIN_FAILURES = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export interface CurrentUser {
  id: string;
  isGuest: boolean;
  email: string | null;
  displayName: string | null;
}

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

// argon2id with the library defaults (m=19 MiB, t=2, p=1: the OWASP minimum).
export const hashPassword = (password: string) => hash(password, { algorithm: 2 });
export const verifyPassword = (passwordHash: string, password: string) => verify(passwordHash, password).catch(() => false);

/** A random 32-byte token goes in the cookie; only its SHA-256 is stored (ADR-004). */
export const startSession = async (userId: Types.ObjectId, ttlMs: number) => {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + ttlMs);
  await Session.create({ tokenHash: sha256(token), userId, expiresAt });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
};

export const sessionTtlMs = () => env().SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
export const guestTtlMs = () => env().GUEST_TTL_HOURS * 60 * 60 * 1000;

/** The signed-in user (or guest) for this request, or null. */
export const currentUser = async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  await connectDb();
  const session = await Session.findOne({ tokenHash: sha256(token), expiresAt: { $gt: new Date() } }).lean();
  if (!session) return null;
  const user = await User.findById(session.userId).lean();
  if (!user) return null;
  return { id: String(user._id), isGuest: user.isGuest, email: user.email ?? null, displayName: user.displayName ?? null };
};

/** Ends this request's session: row deleted, cookie cleared. */
export const endSession = async () => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await connectDb();
    await Session.deleteOne({ tokenHash: sha256(token) });
  }
  jar.delete(SESSION_COOKIE);
};

/** Login rate limit: 5 failures per email per 15 minutes. Stores a hash of the email, never the email. */
export const loginRateLimited = async (email: string) =>
  (await LoginAttempt.countDocuments({ emailHash: sha256(email), expiresAt: { $gt: new Date() } })) >= MAX_LOGIN_FAILURES;

export const recordLoginFailure = (email: string) =>
  LoginAttempt.create({ emailHash: sha256(email), expiresAt: new Date(Date.now() + LOGIN_WINDOW_MS) });
