import { existsSync, readFileSync } from 'node:fs';
import { PlanConfigSchema, type RuleResult } from '@claimsense/shared';
import { describe, expect, it } from 'vitest';
import { facts, fixture, testPlan } from '../test/factories';
import { ClaimFactsSchema } from '@claimsense/shared';
import { pickClarifiers } from './clarifiers';
import { simulateFacts } from './what-if';

// docs/test-cases.md TC-WI-* / TC-CLAR-* (arithmetic there). Real Star FHO config, as `pnpm cases`.
const starFho = () => {
  const url = new URL('../../../config/plans/star-fho.json', import.meta.url);
  if (!existsSync(url)) throw new Error('star-fho.json missing');
  return PlanConfigSchema.parse(JSON.parse(readFileSync(url, 'utf8')));
};
const sample = (id: 'A' | 'B' | 'C') => ClaimFactsSchema.parse(fixture(id, 'case'));
const outcome = (results: RuleResult[], id: RuleResult['ruleId']) => results.find((r) => r.ruleId === id)?.outcome;

describe('simulateFacts', () => {
  it('TC-WI-01 Case B with an accident is unchanged', () => {
    expect(simulateFacts(sample('B'), starFho(), { isAccident: true }, 1).payablePaise).toBe(20_580_000);
  });

  it('TC-WI-02 Case A with an accident passes the initial wait', () => {
    const e = simulateFacts(sample('A'), starFho(), { isAccident: true }, 1);
    expect(outcome(e.results, 'R2')).toBe('pass');
    expect(e.payablePaise).toBe(1_000_000);
  });

  it('TC-WI-03 Case C admitted when its wait ends: R3 passes, R1 needs a renewal', () => {
    const e = simulateFacts(sample('C'), starFho(), { admissionDate: '2027-06-01' }, 1);
    expect([outcome(e.results, 'R3'), outcome(e.results, 'R1'), e.verdict]).toEqual(['pass', 'fail', 'at_risk']);
  });

  it('TC-WI-04 Case B with ₹5 lakh sum insured: a single room is within the tier', () => {
    const e = simulateFacts(sample('B'), starFho(), { sumInsuredPaise: 50_000_000 }, 1);
    expect([outcome(e.results, 'R6'), e.payablePaise]).toEqual(['pass', 23_040_000]);
  });

  it('TC-WI-05 declaring the PED settles R5', () => {
    const f = facts({ firstInceptionDate: '2025-01-10', ped: { exists: true, condition: 'Diabetes', firstDiagnosedDate: '2020-01-01', disclosed: false } });
    expect(outcome(simulateFacts(f, testPlan(), {}, 1).results, 'R5')).toBe('fail');
    expect(outcome(simulateFacts(f, testPlan(), { pedDisclosed: true }, 1).results, 'R5')).toBe('pass');
  });
});

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
    const b = simulateFacts(sample('B'), starFho(), {}, 1);
    expect(pickClarifiers(b.results, new Set())).toEqual([]);
  });
});
