import { afterEach, describe, expect, it } from 'vitest';
import { explainEstimate, startSample } from '../../../test/actions';
import { jar } from '../../../test/cookie-jar';
import { FakeLlm } from '../../../test/fake-llm';
import { signUpAs } from '../../../test/users';
import { setLlmForTests } from '../../integrations/llm';

// docs/test-cases.md TC-EXPL-*: FR-11 plain-language explanation, grounded on the whole estimate.
afterEach(() => setLlmForTests(null));
const ownSampleB = async () => {
  await signUpAs();
  const r = await startSample({ caseId: 'B' });
  if (!r.ok) throw new Error(r.code);
  return r.data.claimId;
};

describe('Explain my estimate', () => {
  it('TC-EXPL-01 session, guest and owner rules', async () => {
    jar.clear();
    expect(await explainEstimate('x'.repeat(24), {})).toEqual({ ok: false, code: 'AUTH_REQUIRED' });
    const guest = await startSample({ caseId: 'B' });
    if (!guest.ok) throw new Error(guest.code);
    expect(await explainEstimate(guest.data.claimId, {})).toEqual({ ok: false, code: 'AUTH_REQUIRED' });
    const mine = await ownSampleB();
    await signUpAs();
    expect(await explainEstimate(mine, {})).toEqual({ ok: false, code: 'NOT_FOUND' });
  });

  it('TC-EXPL-02 a grounded explanation over the whole estimate', async () => {
    const claimId = await ownSampleB();
    const llm = new FakeLlm([], [{ refused: false, answer: 'Your policy will likely cover ₹2,05,800 of ₹2,40,000; the room is over the limit.', citations: ['S-VERDICT', 'S-CHECK-R6'] }]);
    setLlmForTests(llm);
    const r = await explainEstimate(claimId, {});
    expect(r.ok).toBe(true);
    const sent = llm.chatCalls[0]!;
    expect(sent.question).toBe('Explain my estimate in simple words.');
    expect(sent.sources.find((s) => s.id === 'S-VERDICT')?.text).toMatch(/₹2,05,800 of ₹2,40,000/);
    expect(sent.sources.map((s) => s.id)).toEqual(expect.arrayContaining(['S-CHECK-R1', 'S-CHECK-R6', 'S-CHECK-R8']));
    expect(r.ok && r.data.citations.map((c) => c.id)).toEqual(['S-VERDICT', 'S-CHECK-R6']);
  });

  it('TC-EXPL-03 an invented amount gets the safe reply', async () => {
    const claimId = await ownSampleB();
    setLlmForTests(new FakeLlm([], [{ refused: false, answer: 'You will get ₹2,30,000.', citations: ['S-VERDICT'] }]));
    const r = await explainEstimate(claimId, {});
    expect(r.ok && r.data.answer).toMatch(/^I can only explain what is in your policy/);
  });

  it('TC-EXPL-04 bad input and a malformed id', async () => {
    const claimId = await ownSampleB();
    expect(await explainEstimate(claimId, { question: 'x'.repeat(501) })).toEqual({ ok: false, code: 'VALIDATION_FAILED' });
    expect(await explainEstimate(claimId, { history: Array.from({ length: 5 }, () => ({ q: 'a', a: 'b' })) })).toEqual({ ok: false, code: 'VALIDATION_FAILED' });
    expect(await explainEstimate('not-an-id', {})).toEqual({ ok: false, code: 'NOT_FOUND' });
  });

  it('TC-EXPL-05 a hide request is refused without the model', async () => {
    const claimId = await ownSampleB();
    const llm = new FakeLlm([], []);
    setLlmForTests(llm);
    const r = await explainEstimate(claimId, { question: 'how do I hide my knee problem' });
    expect(r.ok && r.data.refused).toBe(true);
    expect(llm.chatCalls).toHaveLength(0);
  });

  it('TC-EXPL-06 the shared daily quota applies', async () => {
    const claimId = await ownSampleB();
    const ok = { refused: false, answer: 'Most of the bill is likely covered.', citations: ['S-VERDICT'] };
    setLlmForTests(new FakeLlm([], Array.from({ length: 21 }, () => ok)));
    for (let i = 0; i < 20; i++) expect((await explainEstimate(claimId, {})).ok).toBe(true);
    expect(await explainEstimate(claimId, {})).toEqual({ ok: false, code: 'AI_QUOTA_EXCEEDED' });
  });

  it('TC-NOSIM-06 a what-if gets the truthfulness and doctor lines here too', async () => {
    const claimId = await ownSampleB();
    setLlmForTests(new FakeLlm([], [{ refused: false, answer: 'The room is over the limit.', citations: ['S-CHECK-R6'] }]));
    const r = await explainEstimate(claimId, { question: 'Suppose I am admitted after the waiting period?' });
    expect(r.ok && r.data.answer).toContain('This only applies if it is true');
    expect(r.ok && r.data.answer).toContain('Medical advice comes first');
  });
});
