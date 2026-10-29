import { describe, expect, it } from 'vitest';
import { jar } from '../../../test/cookie-jar';
import { actAs, signUpAs } from '../../../test/users';
import { createClaim, deleteClaim, deleteMe } from '../../../test/actions';
import { runCheck, simulateRoom } from '../../../test/actions';
import { addFact, confirmFact, editFact } from '../../../test/actions';
import { SESSION_COOKIE } from '../../core/session';
import { Claim, EstimateModel, ExtractionUsage, FactModel, Session, User } from '../../core/models';
import { findClaim } from '../../core/scope';

const newClaim = async () => {
  const r = await createClaim({
    planId: 'star-fho',
    subject: { relation: 'parent', treatment: 'Knee replacement' },
    consent: { analysis: true, retention: true, improve: false },
    admissionDate: '2026-11-18',
    room: { category: 'single', rentPerDayPaise: 700_000 },
  });
  if (!r.ok) throw new Error(r.code);
  return r.data.claimId;
};

const someFactId = async (claimId: string) => String((await FactModel.findOne({ claimId }).lean())!._id);

// Every action that takes a claim id, called with `claimId`.
const claimActions = (claimId: string, factId: string) => [
  () => runCheck({ claimId }),
  () => simulateRoom({ claimId, category: 'shared', rentPerDayPaise: 450_000 }),
  () => confirmFact({ claimId, factId }),
  () => editFact({ claimId, factId, value: '2026-11-19' }),
  () => addFact({ claimId, key: 'diagnosis', head: 'none', value: 'Osteoarthritis' }),
  () => deleteClaim({ claimId }),
];

describe('Ownership', () => {
  it('TC-OWN-01 every claim action needs a session', async () => {
    await signUpAs();
    const claimId = await newClaim();
    const factId = await someFactId(claimId);
    actAs(null);
    for (const call of claimActions(claimId, factId)) expect(await call()).toEqual({ ok: false, code: 'AUTH_REQUIRED' });
    expect(await createClaim({})).toEqual({ ok: false, code: 'AUTH_REQUIRED' });
    expect(await deleteMe()).toEqual({ ok: false, code: 'AUTH_REQUIRED' });
  });

  it("TC-OWN-02 another user's claim is not found, and stays unchanged", async () => {
    const b = await signUpAs();
    const claimId = await newClaim();
    const factId = await someFactId(claimId);
    const before = await FactModel.find({ claimId }).lean();
    await signUpAs(); // user A
    for (const call of claimActions(claimId, factId)) expect(await call()).toEqual({ ok: false, code: 'NOT_FOUND' });
    expect(await FactModel.find({ claimId }).lean()).toEqual(before);
    actAs(b);
    expect((await runCheck({ claimId })).ok).toBe(true);
  });

  it('TC-OWN-03 a malformed id is not found', async () => {
    await signUpAs();
    const claimId = await newClaim();
    const user = await Claim.findById(claimId).lean();
    expect(await runCheck({ claimId: 'not-an-id' })).toEqual({ ok: false, code: 'NOT_FOUND' });
    expect(await findClaim(String(user!.userId), '../x')).toBeNull();
    expect(await confirmFact({ claimId, factId: '{"$ne":null}' })).toEqual({ ok: false, code: 'NOT_FOUND' });
  });

  it('TC-OWN-04 delete my data removes every row of the user and nothing else', async () => {
    const b = await signUpAs();
    const bClaim = await newClaim();
    const a = await signUpAs();
    const aUser = (await Session.findOne({}).sort({ _id: -1 }).lean())!.userId;
    const c1 = await newClaim();
    await newClaim();
    await runCheck({ claimId: c1 });
    await ExtractionUsage.create({ userId: aUser, day: '2026-10-29', count: 1, expiresAt: new Date(Date.now() + 86_400_000) });
    expect(await EstimateModel.countDocuments({ userId: aUser })).toBe(1);

    expect(await deleteMe()).toEqual({ ok: true, data: null });
    expect(jar.get(SESSION_COOKIE)).toBeUndefined();
    const owned = [Claim, FactModel, EstimateModel, Session, ExtractionUsage] as unknown as { countDocuments(filter: object): Promise<number> }[];
    for (const model of owned) expect(await model.countDocuments({ userId: aUser })).toBe(0);
    expect(await User.countDocuments({ _id: aUser })).toBe(0);

    actAs(a);
    expect(await runCheck({ claimId: c1 })).toEqual({ ok: false, code: 'AUTH_REQUIRED' });
    actAs(b);
    expect((await runCheck({ claimId: bClaim })).ok).toBe(true);
  });
});
