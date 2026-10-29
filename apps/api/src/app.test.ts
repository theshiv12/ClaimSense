import { afterEach, describe, expect, it, vi } from 'vitest';
import { jar } from '../test/cookie-jar';
import { createClaim, signup } from '../test/actions';
import { send, upload } from '../test/http';
import { newEmail, PASSWORD, signUpAs } from '../test/users';
import { Claim } from './core/models';

afterEach(() => vi.restoreAllMocks());

const claimInput = {
  planId: 'star-fho',
  subject: { relation: 'parent', treatment: 'Knee replacement' },
  consent: { analysis: true, retention: true, improve: false },
};

describe('HTTP boundary', () => {
  it('TC-API-01 health check', async () => {
    const r = await send('get', '/healthz');
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ ok: true });
    expect(r.headers['set-cookie']).toBeUndefined();
  });

  it('TC-API-02 error codes map to HTTP statuses, with the ActionResult body', async () => {
    const noSession = await send('post', '/api/claims', claimInput);
    expect([noSession.status, noSession.body]).toEqual([401, { ok: false, code: 'AUTH_REQUIRED' }]);
    const bad = await send('post', '/api/auth/signup', { email: 'nope' });
    expect([bad.status, bad.body]).toEqual([400, { ok: false, code: 'VALIDATION_FAILED' }]);
    await signUpAs();
    const mine = await createClaim(claimInput);
    if (!mine.ok) throw new Error(mine.code);
    await signUpAs();
    const foreign = await send('get', `/api/claims/${mine.data.claimId}`);
    expect([foreign.status, foreign.body]).toEqual([404, { ok: false, code: 'NOT_FOUND' }]);
    const email = newEmail();
    await signup({ email, password: PASSWORD, adultAttested: true });
    const taken = await send('post', '/api/auth/signup', { email, password: PASSWORD, adultAttested: true });
    expect([taken.status, taken.body]).toEqual([409, { ok: false, code: 'EMAIL_TAKEN' }]);
  });

  it('TC-API-03 writes from another site are refused', async () => {
    await signUpAs();
    const before = await Claim.countDocuments({});
    const r = await send('post', '/api/claims', claimInput, { Origin: 'https://evil.example' });
    expect([r.status, r.body]).toEqual([401, { ok: false, code: 'AUTH_REQUIRED' }]);
    expect(await Claim.countDocuments({})).toBe(before);
  });

  it('TC-API-04 reads never create sessions', async () => {
    for (const path of ['/api/auth/me', '/api/plans', '/healthz']) {
      const r = await send('get', path);
      expect(r.headers['set-cookie'], path).toBeUndefined();
    }
  });

  it('TC-API-05 the session cookie keeps its flags', async () => {
    const r = await send('post', '/api/auth/signup', { email: newEmail(), password: PASSWORD, adultAttested: true });
    const cookie = [r.headers['set-cookie']].flat().join('\n');
    expect(cookie).toMatch(/^cs_session=[A-Za-z0-9_-]{43};/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/Secure/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).toMatch(/Path=\//);
  });

  it('TC-API-06 request logs never contain bodies, queries or health data', async () => {
    await signUpAs();
    const c = await createClaim(claimInput);
    if (!c.ok) throw new Error(c.code);
    const lines: string[] = [];
    vi.spyOn(console, 'info').mockImplementation((...a: unknown[]) => void lines.push(a.join(' ')));
    vi.spyOn(console, 'error').mockImplementation((...a: unknown[]) => void lines.push(a.join(' ')));
    await send('post', `/api/claims/${c.data.claimId}/facts?q=knee`, { key: 'diagnosis', head: 'none', value: 'Osteoarthritis' });
    const log = lines.join('\n');
    expect(log).toMatch(/POST \/api\/claims\/:claimId\/facts 200 \d+ms/);
    expect(log).not.toMatch(/Osteoarthritis|knee/i);
    expect(log).not.toContain(c.data.claimId);
  });

  it('TC-API-07 over-size uploads are refused', async () => {
    await signUpAs();
    const c = await createClaim(claimInput);
    if (!c.ok) throw new Error(c.code);
    const big = new Uint8Array(4 * 1024 * 1024 + 1);
    big.set([0x25, 0x50, 0x44, 0x46, 0x2d]);
    const r = await upload(`/api/claims/${c.data.claimId}/documents`, big, 'big.pdf', 'application/pdf');
    expect([r.status, r.body]).toEqual([413, { ok: false, code: 'FILE_TOO_LARGE' }]);
  });

  it('TC-API-08 unknown routes and malformed JSON', async () => {
    const nope = await send('get', '/api/nope');
    expect([nope.status, nope.body]).toEqual([404, { ok: false, code: 'NOT_FOUND' }]);
    await signUpAs();
    const bad = await send('post', '/api/claims', '{bad json', { 'Content-Type': 'application/json' });
    expect([bad.status, bad.body]).toEqual([400, { ok: false, code: 'VALIDATION_FAILED' }]);
    expect(jar.get('cs_session')).toBeDefined();
  });

  it('TC-API-09 plans list for the setup form', async () => {
    const r = await send('get', '/api/plans');
    expect(r.body).toEqual({ ok: true, data: [{ planId: 'star-fho', name: expect.stringMatching(/^Family Health Optima .+ \(.+\)$/) as string }] });
  });
});
