import 'server-only';
import type { ActionResult, CurrentUserView } from '@claimsense/shared';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

// Server components read through the API too (ADR-009): straight to API_ORIGIN, server to server,
// forwarding the browser's session cookie. Reads only: they never set or create a session.
const API_ORIGIN = () => process.env.API_ORIGIN ?? 'http://localhost:4000';
const SESSION_COOKIE = 'cs_session';

export const apiGet = async <T>(path: string): Promise<ActionResult<T>> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  try {
    const res = await fetch(`${API_ORIGIN()}${path}`, {
      headers: token ? { cookie: `${SESSION_COOKIE}=${token}` } : {},
      cache: 'no-store',
    });
    return (await res.json()) as ActionResult<T>;
  } catch {
    return { ok: false, code: 'INTERNAL_ERROR' };
  }
};

/** The signed-in user or guest, or null (also null when the API cannot be reached). */
export const currentUser = async (): Promise<CurrentUserView | null> => {
  const r = await apiGet<CurrentUserView | null>('/api/auth/me');
  return r.ok ? r.data : null;
};

/** For pages: the data, or the right page for the error (login for no session, 404 for not found). */
export const apiPage = async <T>(path: string, loginNext: string): Promise<T> => {
  const r = await apiGet<T>(path);
  if (r.ok) return r.data;
  if (r.code === 'AUTH_REQUIRED') redirect(`/login?next=${encodeURIComponent(loginNext)}`);
  // A page's only API inputs are ids from its own path, so a malformed one is a missing page (golden rule 5).
  if (r.code === 'NOT_FOUND' || r.code === 'PLAN_NOT_FOUND' || r.code === 'VALIDATION_FAILED') notFound();
  throw new Error(`API ${r.code}`);
};
