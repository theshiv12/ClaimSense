import type { RuleResult } from '@claimsense/shared';

/**
 * Which checks get an "Evidence" card in the estimate's side column: only those that cut or fail the claim.
 * An Unknown check's row already says what is needed (and "What can I do?" links to add it), so a card would
 * only repeat it and make the side column far longer than the checks (empty space on the left).
 */
export const checksWithEvidence = (results: RuleResult[]): RuleResult[] =>
  results.filter((r) => r.outcome === 'deduction' || r.outcome === 'fail');
