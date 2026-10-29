import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { jar } from '../../test/cookie-jar';
import { actAs, newEmail, PASSWORD, signUpAs } from '../../test/users';
import { login, signup, startSample } from './actions/auth';
import { createClaim, deleteClaim } from './actions/claims';
import { runCheck, simulateRoom } from './actions/estimate';
import { addFact, confirmFact, editFact } from './actions/facts';
import { currentUser, SESSION_COOKIE } from './auth';
import { Session, User } from './models';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

describe('Backend review fixes', () => {
  it('TC-AUTH-09 the login limit holds when wrong passwords arrive in parallel', async () => {
    const email = newEmail('parallel');
    await signUpAs(email);
    actAs(null);
    await Promise.all(Array.from({ length: 8 }, (_, i) => login({ email, password: `wrong-${i}-pass` })));
    expect(await login({ email, password: PASSWORD })).toEqual({ ok: false, code: 'RATE_LIMITED' });
  });

  it('TC-AUTH-10 a guest starting another sample stays the same guest', async () => {
    await startSample({ caseId: 'B' });
    const first = await currentUser();
    const r = await startSample({ caseId: 'D' });
    expect(r.ok).toBe(true);
    expect((await currentUser())?.id).toBe(first?.id);
    expect(await User.countDocuments({ _id: first?.id })).toBe(1);
  });

  it('TC-AUTH-11 samples are rate-limited per IP', async () => {
    for (let i = 0; i < 20; i++) {
      jar.clear();
      expect((await startSample({ caseId: 'A' })).ok).toBe(true);
    }
    jar.clear();
    expect(await startSample({ caseId: 'A' })).toEqual({ ok: false, code: 'RATE_LIMITED' });
  });

  it('TC-AUTH-12 signup and login end the session the browser already had', async () => {
    await startSample({ caseId: 'B' });
    const guestToken = jar.get(SESSION_COOKIE)!.value;
    const email = newEmail('upgrade');
    expect((await signup({ email, password: PASSWORD, adultAttested: true })).ok).toBe(true);
    expect(await Session.countDocuments({ tokenHash: sha256(guestToken) })).toBe(0);
    const userToken = jar.get(SESSION_COOKIE)!.value;
    expect((await login({ email, password: PASSWORD })).ok).toBe(true);
    expect(await Session.countDocuments({ tokenHash: sha256(userToken) })).toBe(0);
  });

  it('TC-ACT-07 every action rejects bad input with VALIDATION_FAILED', async () => {
    await signUpAs();
    const bad = 'VALIDATION_FAILED';
    for (const call of [
      () => createClaim(null),
      () => deleteClaim({}),
      () => runCheck(null),
      () => simulateRoom({ claimId: 'x' }),
      () => confirmFact({ claimId: 'x' }),
      () => editFact({ claimId: 'x', factId: 'y' }),
      () => addFact({ claimId: 'x', key: 'diagnosis', head: 'none', value: 'x'.repeat(501) }),
      () => startSample(null),
      () => login({ email: 'not-an-email', password: 'x' }),
    ]) {
      expect(await call()).toEqual({ ok: false, code: bad });
    }
  });
});

describe('Backend review fixes (UI phase)', () => {
  it('TC-AUTH-13 a signed-in user opening a sample keeps their session', async () => {
    const token = await signUpAs();
    const before = await currentUser();
    const r = await startSample({ caseId: 'B' });
    expect(r.ok).toBe(true);
    expect(jar.get(SESSION_COOKIE)?.value).toBe(token);
    expect((await currentUser())?.id).toBe(before?.id);
    expect(r.ok && (await runCheck({ claimId: r.data.claimId })).ok).toBe(true);
  });
});
