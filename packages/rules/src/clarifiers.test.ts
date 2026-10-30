import { existsSync, readFileSync } from 'node:fs';
import { ClaimFactsSchema, PlanConfigSchema, type RuleResult } from '@claimsense/shared';
import { describe, expect, it } from 'vitest';
import { fixture } from '../test/factories';
import { pickClarifiers } from './clarifiers';
import { estimate } from './engine';

// docs/test-cases.md TC-CLAR-*. (Moved from what-if.test.ts when simulation was removed, ADR-012; unchanged.)
const starFho = () => {
  const url = new URL('../../../config/plans/star-fho.json', import.meta.url);
  if (!existsSync(url)) throw new Error('star-fho.json missing');
  return PlanConfigSchema.parse(JSON.parse(readFileSync(url, 'utf8')));
};
const sample = (id: 'B') => ClaimFactsSchema.parse(fixture(id, 'case'));

const unknown = (ruleId: RuleResult['ruleId'], missingFacts: RuleResult['missingFacts']): RuleResult => ({
  ruleId, outcome: 'unknown', applicable: true, reasonCode: 'X', deductionPaise: 0, clause: null, usedFacts: [], missingFacts, params: {},
});
const ownClaim = [
  unknown('R1', ['policy_start_date', 'policy_end_date', 'admission_date']),
  unknown('R2', ['first_inception_date', 'admission_date']),
  unknown('R3', ['diagnosis']),
  unknown('R4', ['ped_exists']),
  unknown('R6', ['bill_line_item']),
  unknown('R7', ['age_at_entry']),
  unknown('R8', ['sum_insured_used']),
];

describe('pickClarifiers', () => {
  it('TC-CLAR-01 at most 2 questions, those that settle the most checks', () => {
    expect(pickClarifiers(ownClaim, new Set())).toEqual([{ key: 'admission_date', mode: 'ask' }, { key: 'policy_start_date', mode: 'ask' }]);
  });

  it('TC-CLAR-02 a pending document value is confirmed, not asked', () => {
    expect(pickClarifiers(ownClaim, new Set(['admission_date']))).toEqual([{ key: 'admission_date', mode: 'confirm' }, { key: 'policy_start_date', mode: 'ask' }]);
  });

  it('TC-CLAR-03 nothing to ask when nothing is unknown', () => {
    const b = estimate(sample('B'), starFho(), 1);
    expect(pickClarifiers(b.results, new Set())).toEqual([]);
  });
});
