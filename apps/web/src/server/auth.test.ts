import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { jar } from '../../test/cookie-jar';
import { actAs, newEmail, PASSWORD, signUpAs } from '../../test/users';
import { login, logout, signup, startSample } from './actions/auth';
import { runCheck } from './actions/estimate';
import { currentUser, SESSION_COOKIE } from './auth';
import { connectDb } from './db';
import { Session, User } from './models';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

describe('Auth', () => {
  it('TC-AUTH-01 signs up with an argon2id hash and a locked-down session cookie', async () => {
    const email = newEmail('new');
    const r = await signup({ email, password: PASSWORD, adultAttested: true });
    expect(r.ok).toBe(true);
    await connectDb();
    const user = await User.findOne({ email }).lean();
    expect(user?.passwordHash).toMatch(/^\$argon2id\$/);
    expect(JSON.stringify(user)).not.toContain(PASSWORD);
    expect(jar.get(SESSION_COOKIE)?.value).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 random bytes, base64url
    expect(jar.options.get(SESSION_COOKIE)).toMatchObject({ httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
  });

  it('TC-AUTH-02 rejects an email that is already taken, whatever its case', async () => {
    const email = newEmail('dup');
    await signUpAs(email);
    actAs(null);
    expect(await signup({ email: email.toUpperCase(), password: PASSWORD, adultAttested: true })).toEqual({ ok: false, code: 'EMAIL_TAKEN' });
  });

  it('TC-AUTH-03 gives the same error for a wrong password and an unknown email', async () => {
    const email = newEmail('login');
    await signUpAs(email);
    actAs(null);
    expect(await login({ email, password: 'wrong-pass-1' })).toEqual({ ok: false, code: 'AUTH_INVALID' });
    expect(await login({ email: newEmail('nobody'), password: PASSWORD })).toEqual({ ok: false, code: 'AUTH_INVALID' });
    expect((await login({ email, password: PASSWORD })).ok).toBe(true);
    expect(jar.get(SESSION_COOKIE)).toBeDefined();
  });

  it('TC-AUTH-04 rate-limits after 5 failed tries for one email', async () => {
    const email = newEmail('rate');
    await signUpAs(email);
    actAs(null);
    for (let i = 0; i < 5; i++) expect((await login({ email, password: `wrong-${i}-pass` })).ok).toBe(false);
    expect(await login({ email, password: PASSWORD })).toEqual({ ok: false, code: 'RATE_LIMITED' });
  });

  it('TC-AUTH-05 stores only the SHA-256 of the session token', async () => {
    const token = await signUpAs();
    const session = await Session.findOne({ tokenHash: sha256(token) }).lean();
    expect(session).not.toBeNull();
    expect(await Session.countDocuments({ tokenHash: token })).toBe(0);
  });

  it('TC-AUTH-06 logout clears the cookie and deletes the session', async () => {
    const token = await signUpAs();
    await logout();
    expect(jar.get(SESSION_COOKIE)).toBeUndefined();
    expect(await Session.countDocuments({ tokenHash: sha256(token) })).toBe(0);
    actAs(token);
    expect(await currentUser()).toBeNull();
  });

  it('TC-AUTH-07 a guest can open sample B and gets the Case B estimate', async () => {
    const r = await startSample({ caseId: 'B' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect((await currentUser())?.isGuest).toBe(true);
    const e = await runCheck({ claimId: r.data.claimId });
    expect(e.ok && e.data.estimate.payablePaise).toBe(20_580_000);
    expect(await startSample({ caseId: 'Z' })).toEqual({ ok: false, code: 'VALIDATION_FAILED' });
  });

  it('TC-AUTH-08 an expired session is not a session', async () => {
    const token = await signUpAs();
    await Session.updateOne({ tokenHash: sha256(token) }, { expiresAt: new Date(Date.now() - 1000) });
    expect(await currentUser()).toBeNull();
  });
});
