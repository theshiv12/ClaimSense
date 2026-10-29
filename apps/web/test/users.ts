import { randomUUID } from 'node:crypto';
import { signup } from '@/server/actions/auth';
import { SESSION_COOKIE } from '@/server/auth';
import { jar } from './cookie-jar';

export const PASSWORD = 'correct-horse-9';

/** A fresh synthetic email, so tests never share users. */
export const newEmail = (name = 'user') => `${name}-${randomUUID()}@example.test`;

/** Signs up a new user and returns its session token; the jar is left logged in as that user. */
export const signUpAs = async (email = newEmail()): Promise<string> => {
  jar.clear();
  const r = await signup({ email, password: PASSWORD, adultAttested: true });
  if (!r.ok) throw new Error(`signup failed: ${r.code}`);
  return jar.get(SESSION_COOKIE)!.value;
};

/** Switches the fake browser to the session `token` (or to no session). */
export const actAs = (token: string | null) => {
  jar.clear();
  if (token) jar.set(SESSION_COOKIE, token);
};
