import { describe, expect, it } from 'vitest';
import { addFact, createClaim, startSample } from '../../../test/actions';
import { send } from '../../../test/http';
import { signUpAs } from '../../../test/users';

// docs/test-cases.md TC-CLAR-04: FR-6 in the estimate view.
describe('Clarifiers in the estimate view', () => {
  it('TC-CLAR-04 an own claim with few facts asks 2 questions; sample B asks none', async () => {
    await signUpAs();
    const c = await createClaim({ planId: 'star-fho', subject: { relation: 'self', treatment: 'Knee replacement' }, consent: { analysis: true, retention: true, improve: false } });
    if (!c.ok) throw new Error(c.code);
    await addFact({ claimId: c.data.claimId, key: 'sum_insured', head: 'none', value: 30_000_000 });
    const view = (await send('get', `/api/claims/${c.data.claimId}/estimate`)).body as { data: { clarifiers: { key: string; mode: string; question: string }[] } };
    expect(view.data.clarifiers).toEqual([
      { key: 'admission_date', mode: 'ask', question: 'When is the planned admission?' },
      { key: 'policy_start_date', mode: 'ask', question: 'When did this year’s policy start (on your policy schedule)?' },
    ]);
    const b = await startSample({ caseId: 'B' });
    if (!b.ok) throw new Error(b.code);
    const vb = (await send('get', `/api/claims/${b.data.claimId}/estimate`)).body as { data: { clarifiers: unknown[] } };
    expect(vb.data.clarifiers).toEqual([]);
  });
});
