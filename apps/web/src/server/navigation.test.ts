import { describe, expect, it } from 'vitest';
import { jar } from '../../test/cookie-jar';
import { logout, signup } from './actions/auth';
import { openSample } from './actions/navigation';
import { SESSION_COOKIE } from './auth';

const redirectOf = async (p: Promise<unknown>) => {
  try {
    await p;
    return null;
  } catch (err) {
    // next/navigation redirect() throws an error whose digest carries the target.
    return String((err as { digest?: string }).digest ?? '');
  }
};

describe('Remaining actions', () => {
  it('TC-ACT-08 bad input and no session on signup, logout and openSample', async () => {
    expect(await signup({ email: 'nope', password: 'short', adultAttested: true })).toEqual({ ok: false, code: 'VALIDATION_FAILED' });
    expect(await signup(null)).toEqual({ ok: false, code: 'VALIDATION_FAILED' });
    expect(await logout()).toEqual({ ok: true, data: null });
    const bad = new FormData();
    bad.set('caseId', 'Z');
    expect(await redirectOf(openSample(bad))).toMatch(/;\/;/);
    expect(jar.get(SESSION_COOKIE)).toBeUndefined();
    const good = new FormData();
    good.set('caseId', 'B');
    expect(await redirectOf(openSample(good))).toMatch(/\/claims\/[a-f0-9]{24}/);
  });
});
