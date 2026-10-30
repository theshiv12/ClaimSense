import type { RuleResult } from '@claimsense/shared';
import { describe, expect, it } from 'vitest';
import { checksWithEvidence } from './estimate-layout';

const r = (ruleId: RuleResult['ruleId'], outcome: RuleResult['outcome']): RuleResult => ({
  ruleId, outcome, applicable: true, reasonCode: 'X', deductionPaise: outcome === 'deduction' ? 1 : 0,
  clause: null, usedFacts: [], missingFacts: outcome === 'unknown' ? ['admission_date'] : [], params: {},
});

describe('checksWithEvidence', () => {
  it('TC-UI-19 only checks that cut or fail the claim get an evidence card', () => {
    const results = [r('R1', 'unknown'), r('R2', 'fail'), r('R5', 'pass'), r('R6', 'deduction'), r('R7', 'unknown')];
    expect(checksWithEvidence(results).map((x) => x.ruleId)).toEqual(['R2', 'R6']);
  });
});
