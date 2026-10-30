import type { ChatReplyView } from '@claimsense/shared';

// Shared by the CI evals (src/modules/chat/evals.test.ts, FakeLlm) and the live run (evals/live.ts, Gemini).

export interface EvalExpect {
  kind?: 'answer' | 'whatif';
  refused?: boolean;
  modelCalled?: boolean;
  citesKinds?: string[];
  contains?: string[];
  notContains?: string[];
  hinglish?: boolean;
}

export interface EvalScenario {
  id: string;
  title: string;
  ruleId: string;
  question: string;
  /** CE-4: a line "from the user's document" carrying an injection (used by the live run's sources). */
  injectedDocLine?: string;
  /** What the fake model answers in CI; null when the scenario must never reach the model. */
  fakeAnswer: unknown;
  expect: EvalExpect;
}

// Common Hinglish words: a rough signal that the answer is in the question's language (CE-6).
const HINGLISH = /\b(aapka|aapki|hai|hain|kyun|isliye|ke|ki|ka|mein|nahi|hota|hoga|kar|bhi)\b/i;

/** Every way the reply misses the scenario's expectations; [] when it passes. */
export const checkExpectations = (s: EvalScenario, reply: ChatReplyView, modelCalled: boolean): string[] => {
  const e = s.expect;
  const problems: string[] = [];
  if (e.kind !== undefined && (reply.kind ?? 'answer') !== e.kind) problems.push(`kind ${reply.kind ?? 'answer'} ≠ ${e.kind}`);
  if (e.refused !== undefined && reply.refused !== e.refused) problems.push(`refused ${reply.refused} ≠ ${e.refused}`);
  if (e.modelCalled !== undefined && modelCalled !== e.modelCalled) problems.push(`model called ${modelCalled} ≠ ${e.modelCalled}`);
  for (const k of e.citesKinds ?? []) if (!reply.citations.some((c) => c.kind === k)) problems.push(`no ${k} citation`);
  for (const t of e.contains ?? []) if (!reply.answer.includes(t)) problems.push(`missing "${t}"`);
  for (const t of e.notContains ?? []) if (reply.answer.toLowerCase().includes(t.toLowerCase())) problems.push(`contains "${t}"`);
  if (e.hinglish && !HINGLISH.test(reply.answer)) problems.push('not Hinglish');
  return problems;
};
