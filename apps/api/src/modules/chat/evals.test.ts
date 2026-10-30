import { readdirSync, readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { askAboutCheck, startSample } from '../../../test/actions';
import { FakeLlm } from '../../../test/fake-llm';
import { signUpAs } from '../../../test/users';
import { setLlmForTests } from '../../integrations/llm';
import { checkExpectations, type EvalScenario } from '../../../evals/expect';

// docs/test-cases.md TC-EVAL-01: CE-1..CE-6 (FR-18) through the real pipeline, with FakeLlm answering.
const dir = new URL('../../../evals/conversations/', import.meta.url);
const scenarios = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')) as EvalScenario);

afterEach(() => setLlmForTests(null));

describe('Conversation evals', () => {
  it('TC-EVAL-01 all six scenarios exist', () => {
    expect(scenarios.map((s) => s.id)).toEqual(['CE-1', 'CE-2', 'CE-3', 'CE-4', 'CE-5', 'CE-6']);
  });

  for (const s of scenarios) {
    it(`TC-EVAL-01 ${s.id} ${s.title}`, async () => {
      await signUpAs();
      const b = await startSample({ caseId: 'B' });
      if (!b.ok) throw new Error(b.code);
      const llm = new FakeLlm([], s.fakeAnswer ? [s.fakeAnswer] : []);
      setLlmForTests(llm);
      const r = await askAboutCheck(b.data.claimId, s.ruleId, { question: s.question });
      if (!r.ok) throw new Error(r.code);
      expect(checkExpectations(s, r.data, llm.chatCalls.length > 0)).toEqual([]);
    });
  }
});

describe('Conversation evals: injected document line', () => {
  it('TC-EVAL-02 CE-4’s injected line reaches the sources and the answer is still replaced', async () => {
    const { LlmChatAnswerSchema } = await import('@claimsense/shared');
    const { checkSources, finalize } = await import('./chat.service');
    const { estimate } = await import('@claimsense/rules');
    const { getPlan, remedies } = await import('../../lib/plans');
    const { SAMPLES } = await import('../../lib/samples');
    const s = scenarios.find((x) => x.id === 'CE-4')!;
    const line = Buffer.from(s.injectedDocLineB64!, 'base64').toString('utf8');
    const result = estimate(SAMPLES.B.facts, getPlan(SAMPLES.B.facts.planId)!, 0).results.find((r) => r.ruleId === 'R6')!;
    const sources = checkSources({ evidence: { R6: [{ key: 'room_rent_per_day', quote: line, page: 1 }] }, remedies: remedies.remedies, precedents: {} }, result);
    expect(sources.find((x) => x.id === 'S-DOC-1')?.text).toBe(line);
    const llm = new FakeLlm([], [s.fakeAnswer]);
    const out = finalize(LlmChatAnswerSchema.parse(await llm.answer({ sources, question: s.question, history: [] })), sources);
    expect(checkExpectations(s, out, true)).toEqual([]);
  });
});
