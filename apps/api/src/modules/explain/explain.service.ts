import {
  explain,
  formatInr,
  RULE_TITLES,
  type ChatAskInput,
  type ChatReplyView,
  type ChatSource,
  type CurrentUserView,
  type EstimateView,
} from '@claimsense/shared';
import { fail } from '../../core/errors';
import { HIDE_REFUSAL, refusesToHide, reply, runGrounded, VERDICT_WORDS } from '../chat/chat.service';
import { estimateView } from '../estimate/estimate.service';

// FR-11 "Explain my estimate in simple words" (ADR-011): the same grounded pipeline as the check chat, with the
// whole estimate as sources. Every sentence and amount in the sources is built here from the engine's output.

const OUTCOME_WORDS = { pass: 'Pass', deduction: 'Deduction', fail: 'Fail', unknown: 'Unknown' } as const;

export const estimateSources = (view: EstimateView): ChatSource[] => {
  const e = view.estimate;
  const verdict = [
    `${VERDICT_WORDS[e.verdict]}: ${formatInr(e.payablePaise)} of ${formatInr(e.claimedPaise)} likely paid; you pay about ${formatInr(e.outOfPocketPaise)}`,
    e.nonPayablePaise > 0 ? `, including ${formatInr(e.nonPayablePaise)} of items the policy never pays` : '',
    '.',
    e.payablePaise === 0 && e.payableIfEligiblePaise > 0
      ? ` If the checks marked Fail or Unknown are resolved, the policy would pay about ${formatInr(e.payableIfEligiblePaise)}.`
      : '',
  ].join('');
  return [
    { id: 'S-VERDICT', kind: 'reason', label: 'Your estimate', text: verdict },
    ...e.results.map((r) => ({
      id: `S-CHECK-${r.ruleId}`,
      kind: 'reason' as const,
      label: `${RULE_TITLES[r.ruleId]}${r.clause ? ` (Clause ${r.clause.clauseId})` : ''}`,
      text: `${OUTCOME_WORDS[r.outcome]}. ${explain(r)}`,
    })),
    ...view.remedies.map((m) => ({ id: `S-REM-${m.id}`, kind: 'remedy' as const, label: m.title, text: m.body })),
  ];
};

export const explainEstimate = async (user: CurrentUserView, claimId: string, input: ChatAskInput): Promise<ChatReplyView> => {
  if (user.isGuest) return fail('AUTH_REQUIRED'); // samples promise "no AI call"
  const view = await estimateView(user.id, claimId); // owner-scoped
  if (refusesToHide(input)) {
    console.info('[chat] explain refused=true cited=0 guard=hide');
    return reply(HIDE_REFUSAL, true);
  }
  return runGrounded(user, estimateSources(view), input, 'explain');
};
