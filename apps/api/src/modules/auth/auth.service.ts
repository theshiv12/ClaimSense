import { randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import type { LoginInputSchema, SignupInput } from '@claimsense/shared';
import type { z } from 'zod';
import type { Types } from 'mongoose';
import { env } from '../../core/env';
import { fail } from '../../core/errors';
import { LoginAttempt, SampleStart, User } from '../../core/models';
import { sha256, type SessionPort } from '../../core/session';

const MAX_LOGIN_FAILURES = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_SAMPLES_PER_IP = 20;
const SAMPLE_WINDOW_MS = 60 * 60 * 1000;

// argon2id with the library defaults (m=19 MiB, t=2, p=1: the OWASP minimum).
export const hashPassword = (password: string) => hash(password, { algorithm: 2 });
export const verifyPassword = (passwordHash: string, password: string) => verify(passwordHash, password).catch(() => false);

// An unknown email is checked against this hash too, so login takes the same time either way.
let dummyHash: Promise<string> | undefined;
export const verifyAgainstDummy = async (password: string) => {
  dummyHash ??= hashPassword(randomBytes(16).toString('hex'));
  await verifyPassword(await dummyHash, password);
  return false;
};

export const sessionTtlMs = () => env().SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
export const guestTtlMs = () => env().GUEST_TTL_HOURS * 60 * 60 * 1000;

/**
 * Login rate limit: 5 tries per email per 15 minutes. The attempt is recorded before the password is
 * checked, so parallel requests cannot all slip under the limit. Stores a hash of the email only.
 */
export const takeLoginAttempt = async (email: string) => {
  const emailHash = sha256(email);
  const attempt = await LoginAttempt.create({ emailHash, expiresAt: new Date(Date.now() + LOGIN_WINDOW_MS) });
  const count = await LoginAttempt.countDocuments({ emailHash, expiresAt: { $gt: new Date() } });
  return { allowed: count <= MAX_LOGIN_FAILURES, release: () => LoginAttempt.deleteOne({ _id: attempt._id }) };
};

/** Sample starts per client IP per hour (guests are free to create, so they are limited). Stores a hash of the IP only. */
export const takeSampleStart = async (ip: string) => {
  const ipHash = sha256(ip);
  await SampleStart.create({ ipHash, expiresAt: new Date(Date.now() + SAMPLE_WINDOW_MS) });
  return (await SampleStart.countDocuments({ ipHash, expiresAt: { $gt: new Date() } })) <= MAX_SAMPLES_PER_IP;
};

export const signup = async (input: SignupInput, session: SessionPort) => {
  if (await User.exists({ email: input.email })) return fail('EMAIL_TAKEN');
  const passwordHash = await hashPassword(input.password);
  let userId: Types.ObjectId;
  try {
    ({ _id: userId } = await User.create({ email: input.email, passwordHash, displayName: input.displayName, adultAttested: true, isGuest: false }));
  } catch (err) {
    // A concurrent signup with the same email hits the unique index.
    if (err instanceof Error && 'code' in err && err.code === 11000) return fail('EMAIL_TAKEN');
    throw err;
  }
  await session.end();
  await session.start(userId, sessionTtlMs());
  return null;
};

// Unknown email and wrong password give the same AUTH_INVALID (docs/api.md).
export const login = async ({ email, password }: z.infer<typeof LoginInputSchema>, session: SessionPort) => {
  const attempt = await takeLoginAttempt(email);
  if (!attempt.allowed) return fail('RATE_LIMITED');
  const user = await User.findOne({ email, isGuest: false }).lean();
  const ok = user?.passwordHash ? await verifyPassword(user.passwordHash, password) : await verifyAgainstDummy(password);
  if (!user || !ok) return fail('AUTH_INVALID');
  await attempt.release(); // a successful login does not count against the limit
  await session.end();
  await session.start(user._id, sessionTtlMs());
  return null;
};
