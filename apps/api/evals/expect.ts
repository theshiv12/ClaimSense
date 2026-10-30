import type { ChatReplyView } from '@claimsense/shared';

export interface EvalScenario {
  id: string;
  title: string;
  ruleId: string;
  question: string;
  injectedDocLine?: string;
  fakeAnswer: unknown;
  expect: Record<string, unknown>;
}

export const checkExpectations = (_s: EvalScenario, _reply: ChatReplyView, _modelCalled: boolean): string[] => ['not implemented'];
