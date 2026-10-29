import { describe, expect, it } from 'vitest';
import { signUpAs } from '../../../test/users';
import { startSample } from '../../../test/actions';
import { createClaim, deleteClaim } from '../../../test/actions';
import { runCheck, simulateRoom } from '../../../test/actions';
import { addFact, confirmFact, editFact } from '../../../test/actions';
import { Claim, EstimateModel, FactModel, Session, User } from '../../core/models';

const input = (patch: Record<string, unknown> = {}) => ({
  planId: 'star-fho',
  subject: { relation: 'self', treatment: 'Appendix surgery' },
  consent: { analysis: true, retention: true, improve: false },
  admissionDate: '2026-09-10',
  room: { category: 'shared', rentPerDayPaise: 400_000 },
  ...patch,
});

describe('Server actions', () => {
  it('TC-ACT-01 createClaim stores the claim and user-stated facts', async () => {
    await signUpAs();
    const r = await createClaim(input());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const facts = await FactModel.find({ claimId: r.data.claimId }).lean();
    expect(facts.map((f) => [f.key, f.value as unknown, f.source]).sort()).toEqual([
      ['admission_date', '2026-09-10', 'user-stated'],
      ['room_category', 'shared', 'user-stated'],
      ['room_rent_per_day', 400_000, 'user-stated'],
    ]);
  });

  it('TC-ACT-02 needs analysis consent and a known plan', async () => {
    await signUpAs();
    expect(await createClaim(input({ consent: { analysis: false, retention: true, improve: false } }))).toEqual({ ok: false, code: 'VALIDATION_FAILED' });
    expect(await createClaim(input({ planId: 'no-such-plan' }))).toEqual({ ok: false, code: 'PLAN_NOT_FOUND' });
  });

  it('TC-ACT-03 confirms, edits and adds facts', async () => {
    await signUpAs();
    const r = await createClaim(input());
    if (!r.ok) throw new Error(r.code);
    const { claimId } = r.data;
    const fact = (await FactModel.findOne({ claimId, key: 'admission_date' }).lean())!;
    const factId = String(fact._id);

    const c = await confirmFact({ claimId, factId });
    expect(c.ok && c.data.fact.confirmedByUser).toBe(true);
    expect(await editFact({ claimId, factId, value: '18/11/2026' })).toEqual({ ok: false, code: 'VALIDATION_FAILED' });
    const e = await editFact({ claimId, factId, value: '2026-09-11' });
    expect(e.ok && e.data.fact).toMatchObject({ value: '2026-09-11', source: 'user-corrected', verification: 'none' });
    const a = await addFact({ claimId, key: 'bill_line_item', head: 'surgeon', value: 4_000_000 });
    expect(a.ok && a.data.fact).toMatchObject({ key: 'bill_line_item', head: 'surgeon', source: 'user-stated' });
    expect(await addFact({ claimId, key: 'is_accident', head: 'none', value: 'no' })).toEqual({ ok: false, code: 'VALIDATION_FAILED' });
    expect((await Claim.findById(claimId).lean())!.factsVersion).toBe(3);
  });

  it('TC-ACT-04 runCheck saves the estimate; simulateRoom does not', async () => {
    const s = await startSample({ caseId: 'B' });
    if (!s.ok) throw new Error(s.code);
    const { claimId } = s.data;
    const e = await runCheck({ claimId });
    expect(e.ok && e.data.estimate).toMatchObject({ payablePaise: 20_580_000, claimedPaise: 24_000_000, verdict: 'likely_partial' });
    const sim = await simulateRoom({ claimId, category: 'shared', rentPerDayPaise: 450_000 });
    expect(sim.ok && sim.data.estimate).toMatchObject({ payablePaise: 21_790_000, claimedPaise: 22_750_000, outOfPocketPaise: 960_000 });
    expect(await EstimateModel.countDocuments({ claimId })).toBe(1);
    expect(await simulateRoom({ claimId, category: 'palace', rentPerDayPaise: 1 })).toEqual({ ok: false, code: 'VALIDATION_FAILED' });
  });

  it('TC-ACT-05 deleteClaim removes the claim, its facts and estimates only', async () => {
    await signUpAs();
    const one = await createClaim(input());
    const two = await createClaim(input());
    if (!one.ok || !two.ok) throw new Error('create failed');
    await runCheck({ claimId: one.data.claimId });
    expect(await deleteClaim({ claimId: one.data.claimId })).toEqual({ ok: true, data: null });
    const gone = one.data.claimId;
    expect(await Claim.countDocuments({ _id: gone })).toBe(0);
    expect(await FactModel.countDocuments({ claimId: gone })).toBe(0);
    expect(await EstimateModel.countDocuments({ claimId: gone })).toBe(0);
    expect(await FactModel.countDocuments({ claimId: two.data.claimId })).toBe(3);
  });

  it('TC-ACT-06 owned models expire through a TTL index on expiresAt', async () => {
    await signUpAs();
    for (const model of [Session, Claim, FactModel, EstimateModel, User]) {
      await model.syncIndexes();
      const indexes = (await model.listIndexes()) as { key: Record<string, number>; expireAfterSeconds?: number }[];
      const ttl = indexes.find((i) => i.key.expiresAt === 1);
      expect(ttl?.expireAfterSeconds, model.modelName).toBe(0);
    }
  });
});
