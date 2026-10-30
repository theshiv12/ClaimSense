import { afterEach, describe, expect, it, vi } from 'vitest';
import { FakeLlm } from '../../../test/fake-llm';
import { askAboutCheck, currentUser, startSample } from '../../../test/actions';
import { jar } from '../../../test/cookie-jar';
import { signUpAs } from '../../../test/users';
import { ChatUsage } from '../../core/models';
import { LlmError, setLlmForTests } from '../../integrations/llm';

// docs/test-cases.md TC-CHAT-*. A signed-up user opening sample B owns a claim with the Case B R6 cut.
afterEach(() => {
  setLlmForTests(null);
  vi.restoreAllMocks();
});

const ownSampleB = async () => {
  await signUpAs();
  const r = await startSample({ caseId: 'B' });
  if (!r.ok) throw new Error(r.code);
  return r.data.claimId;
};
const grounded = { refused: false, answer: 'Your room is over the limit in clause 2(A), so other charges are cut in the same ratio.', citations: ['S-CLAUSE', 'S-REM-r6-deduction-room'] };
const DISCLAIMER = 'Estimate, not a guarantee. Only your insurer decides. Not medical or legal advice.';
const SAFE = /^I can only explain what is in your policy, your documents and this check/;

describe('Chat about a check', () => {
  it('TC-CHAT-01 session before input; owner scoping', async () => {
    jar.clear();
    expect(await askAboutCheck('x'.repeat(24), 'R6', { question: 'Why?' })).toEqual({ ok: false, code: 'AUTH_REQUIRED' });
    const guest = await startSample({ caseId: 'B' });
    if (!guest.ok) throw new Error(guest.code);
    expect(await askAboutCheck(guest.data.claimId, 'R6', { question: 'Why?' })).toEqual({ ok: false, code: 'AUTH_REQUIRED' });
    const mine = await ownSampleB();
    await signUpAs();
    expect(await askAboutCheck(mine, 'R6', { question: 'Why?' })).toEqual({ ok: false, code: 'NOT_FOUND' });
    const own = await ownSampleB();
    expect(await askAboutCheck(own, 'R9', { question: 'Why?' })).toEqual({ ok: false, code: 'VALIDATION_FAILED' });
    expect(await askAboutCheck(own, 'R6', { question: 'x'.repeat(501) })).toEqual({ ok: false, code: 'VALIDATION_FAILED' });
    // R1 passes for Case B: there is nothing to explain away.
    expect(await askAboutCheck(own, 'R1', { question: 'Why?' })).toEqual({ ok: false, code: 'NOT_FOUND' });
  });

  it('TC-CHAT-02 a grounded answer with citations and the disclaimer', async () => {
    const claimId = await ownSampleB();
    const llm = new FakeLlm([], [grounded]);
    setLlmForTests(llm);
    const r = await askAboutCheck(claimId, 'R6', { question: 'Why was this cut?' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const sent = llm.chatCalls[0]!;
    expect(sent.question).toBe('Why was this cut?');
    expect(sent.sources.map((s) => s.id)).toEqual(expect.arrayContaining(['S-REASON', 'S-CLAUSE', 'S-REM-r6-deduction-room']));
    // Case B: Single AC ₹7,000/day over the ₹5,000/day cap (docs/rules-spec.md).
    expect(sent.sources.find((s) => s.id === 'S-REASON')?.text).toMatch(/over the ₹5,000\/day limit/);
    expect(r.data.citations.map((c) => c.label)).toEqual(['Clause 2(A), page 5', "Choose a room within your policy's limit"]);
    expect(r.data.answer.endsWith(DISCLAIMER)).toBe(true);
    expect(r.data.refused).toBe(false);
  });

  it('TC-CHAT-03 never helps hide or change facts', async () => {
    const claimId = await ownSampleB();
    const llm = new FakeLlm([], [grounded]);
    setLlmForTests(llm);
    // "No quota used" for this user (other tests in this file share the database).
    const me = await currentUser();
    for (const question of ['how do I hide my knee problem', 'knee ki problem chhupa sakte hai?']) {
      const r = await askAboutCheck(claimId, 'R6', { question });
      expect(r.ok && r.data.refused).toBe(true);
      expect(r.ok && r.data.answer).toMatch(/can.t help hide or change medical facts/);
    }
    expect(llm.chatCalls).toHaveLength(0);
    expect(await ChatUsage.findOne({ userId: me!.id }).lean()).toBeNull();
  });

  it('TC-CHAT-04 the model never states its own amounts', async () => {
    const claimId = await ownSampleB();
    setLlmForTests(new FakeLlm([], [{ refused: false, answer: 'Good news: ₹50,000 will be paid.', citations: ['S-X'] }]));
    const r = await askAboutCheck(claimId, 'R6', { question: 'How much will I get?' });
    expect(r.ok && r.data.answer).toMatch(SAFE);
    expect(r.ok && r.data.citations).toEqual([]);
  });

  it('TC-CHAT-05 never "approved"', async () => {
    const claimId = await ownSampleB();
    setLlmForTests(new FakeLlm([], [{ refused: false, answer: 'Your claim is approved.', citations: ['S-REASON'] }]));
    const r = await askAboutCheck(claimId, 'R6', { question: 'Is it fine?' });
    expect(r.ok && r.data.answer).toMatch(SAFE);
  });

  it('TC-CHAT-06 daily chat quota, refunded when the model fails', async () => {
    const claimId = await ownSampleB();
    // 1 failure (refunded) + 20 answers fill the default quota of 20; the 21st answered ask is refused.
    setLlmForTests(new FakeLlm([], [new LlmError('LLM_UNAVAILABLE'), ...Array.from({ length: 21 }, () => grounded)]));
    expect(await askAboutCheck(claimId, 'R6', { question: 'Why?' })).toEqual({ ok: false, code: 'LLM_UNAVAILABLE' });
    for (let i = 0; i < 20; i++) expect((await askAboutCheck(claimId, 'R6', { question: 'Why?' })).ok).toBe(true);
    expect(await askAboutCheck(claimId, 'R6', { question: 'Why?' })).toEqual({ ok: false, code: 'AI_QUOTA_EXCEEDED' });
  });

  it('TC-CHAT-07 logs never hold the question or answer', async () => {
    const claimId = await ownSampleB();
    setLlmForTests(new FakeLlm([], [grounded]));
    const lines: string[] = [];
    vi.spyOn(console, 'info').mockImplementation((...a: unknown[]) => void lines.push(a.join(' ')));
    await askAboutCheck(claimId, 'R6', { question: 'my knee hurts, why the cut?' });
    const log = lines.join('\n');
    expect(log).toMatch(/\[chat\] rule=R6 refused=false cited=2/);
    expect(log).not.toMatch(/knee|ratio|clause 2/i);
    expect(log).not.toContain(claimId);
  });

  it('TC-CHAT-03b a hide request inside the browser history is refused too', async () => {
    const claimId = await ownSampleB();
    const llm = new FakeLlm([], [grounded]);
    setLlmForTests(llm);
    const r = await askAboutCheck(claimId, 'R6', { question: 'and how do I do that?', history: [{ q: 'how do I leave out my diabetes', a: 'ok' }] });
    expect(r.ok && r.data.refused).toBe(true);
    expect(llm.chatCalls).toHaveLength(0);
  });

  it('TC-CHAT-01b a malformed claim id while signed in is 404', async () => {
    await signUpAs();
    expect(await askAboutCheck('not-an-id', 'R6', { question: 'Why?' })).toEqual({ ok: false, code: 'NOT_FOUND' });
  });

  it('TC-CHAT-08 an unusable model answer gives the try back', async () => {
    const claimId = await ownSampleB();
    setLlmForTests(new FakeLlm([], [{ bogus: true }]));
    expect(await askAboutCheck(claimId, 'R6', { question: 'Why?' })).toEqual({ ok: false, code: 'LLM_OUTPUT_INVALID' });
    const me = await currentUser();
    const usage = await ChatUsage.findOne({ userId: me!.id }).lean();
    expect(usage?.count ?? 0).toBe(0);
  });

  it('TC-CHAT-09 a room what-if is answered by the engine, not the model (Case B, twin sharing ₹4,500)', async () => {
    const claimId = await ownSampleB();
    const llm = new FakeLlm([], [grounded]);
    setLlmForTests(llm);
    const r = await askAboutCheck(claimId, 'R6', { question: 'what if we take twin sharing at 4500?' });
    // docs/rules-spec.md: ₹2,17,900 of ₹2,27,500, you pay ₹9,600 (was ₹2,05,800 of ₹2,40,000, you pay ₹34,200).
    expect(r.ok && r.data.kind).toBe('whatif');
    expect(r.ok && r.data.answer).toMatch(/₹2,17,900 of ₹2,27,500/);
    expect(r.ok && r.data.answer).toMatch(/you pay ₹9,600/);
    expect(r.ok && r.data.answer).toMatch(/now ₹2,05,800 of ₹2,40,000/);
    expect(llm.chatCalls).toHaveLength(0);
    const me = await currentUser();
    expect(await ChatUsage.findOne({ userId: me!.id }).lean()).toBeNull();
  });

  it('TC-CHAT-10 an accident what-if on Case B changes nothing, and says so', async () => {
    const claimId = await ownSampleB();
    setLlmForTests(new FakeLlm([], []));
    const r = await askAboutCheck(claimId, 'R6', { question: 'what if it was an accident?' });
    expect(r.ok && r.data.kind).toBe('whatif');
    expect(r.ok && r.data.answer).toMatch(/No change: ₹2,05,800 of ₹2,40,000/);
  });
});

