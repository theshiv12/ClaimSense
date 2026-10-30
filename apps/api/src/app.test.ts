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

describe('HTTP boundary review fixes', () => {
  it('TC-API-03b every cross-site signal is refused; same-origin and Origin-less calls pass', async () => {
    await signUpAs();
    const crossSite = await send('post', '/api/claims', claimInput, { 'Sec-Fetch-Site': 'cross-site' });
    expect([crossSite.status, crossSite.body]).toEqual([401, { ok: false, code: 'AUTH_REQUIRED' }]);
    const nullOrigin = await send('post', '/api/claims', claimInput, { Origin: 'null' });
    expect(nullOrigin.status).toBe(401);
    const noOrigin = await send('post', '/api/claims', claimInput, { Origin: '' });
    expect(noOrigin.status).toBe(200);
    const { webOrigin } = await import('./core/origin');
    expect(webOrigin('http://localhost:3000/')).toBe('http://localhost:3000');
  });

  it('TC-API-11 the sample limit uses the proxied client IP, never a spoofed X-Forwarded-For', async () => {
    // 20 sample starts per IP per hour; the 21st from the same client is refused, whatever XFF says.
    for (let i = 0; i < 20; i++) {
      jar.clear();
      const r = await send('post', '/api/samples/B', {}, { 'X-Forwarded-For': `203.0.113.${i}` });
      expect(r.status).toBe(200);
    }
    jar.clear();
    const blocked = await send('post', '/api/samples/B', {}, { 'X-Forwarded-For': '198.51.100.7' });
    expect([blocked.status, blocked.body]).toEqual([429, { ok: false, code: 'RATE_LIMITED' }]);
    // A wrong proxy key: the vouched-for IP header is ignored, so this counts as another (socket) client.
    jar.clear();
    const wrongKey = await send('post', '/api/samples/B', {}, { 'X-CS-Proxy-Key': 'wrong' });
    expect(wrongKey.status).toBe(200);
  });

  it('TC-API-12 undecodable paths, broken multipart and foreign upload targets', async () => {
    await signUpAs();
    const undecodable = await send('get', '/api/claims/%E0%A4%A');
    expect([undecodable.status, undecodable.body]).toEqual([404, { ok: false, code: 'NOT_FOUND' }]);
    const mine = await createClaim(claimInput);
    if (!mine.ok) throw new Error(mine.code);
    const truncated = '--x\r\nContent-Disposition: form-data; name="file"; filename="a"\r\n\r\nabc';
    const broken = await send('post', `/api/claims/${mine.data.claimId}/documents`, truncated, { 'Content-Type': 'multipart/form-data; boundary=x' });
    expect([broken.status, broken.body]).toEqual([400, { ok: false, code: 'VALIDATION_FAILED' }]);
    await signUpAs();
    const foreign = await upload(`/api/claims/${mine.data.claimId}/documents`, new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), 'a.pdf', 'application/pdf');
    expect([foreign.status, foreign.body]).toEqual([404, { ok: false, code: 'NOT_FOUND' }]);
  });
});

describe('Simulation removed', () => {
  it('TC-SIM-01 there is no simulation endpoint', async () => {
    await signUpAs();
    const c = await createClaim(claimInput);
    if (!c.ok) throw new Error(c.code);
    const r = await send('post', `/api/claims/${c.data.claimId}/simulate-room`, { category: 'shared', rentPerDayPaise: 450_000 });
    expect([r.status, r.body]).toEqual([404, { ok: false, code: 'NOT_FOUND' }]);
  });
});

