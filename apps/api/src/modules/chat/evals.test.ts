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
