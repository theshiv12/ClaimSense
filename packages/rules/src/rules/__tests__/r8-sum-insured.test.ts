import { describe, expect, it } from 'vitest';
import { facts, testPlan } from '../../../test/factories';
import { r8SumInsured } from '../r8-sum-insured';

// docs/rules-spec.md R8: running amount ≤ SI − SI used, otherwise capped.
const plan = testPlan(); // clause T-8
const run = (sumInsuredPaise: number | null, sumInsuredUsedPaise: number | null, running: number) =>
  r8SumInsured(facts({ sumInsuredPaise, sumInsuredUsedPaise }), plan, running);

describe('R8 sum insured cap', () => {
  it('TC-R8-01 passes when the running amount is exactly the SI', () => {
    const r = run(30_000_000, 0, 30_000_000);
    expect(r.outcome).toBe('pass');
    expect(r.deductionPaise).toBe(0);
  });

  it('TC-R8-02 caps 1 paise over the SI', () => {
    // 30000001 − (30000000 − 0) = 1.
    const r = run(30_000_000, 0, 30_000_001);
    expect(r.outcome).toBe('deduction');
    expect(r.deductionPaise).toBe(1);
    expect(r.clause?.clauseId).toBe(plan.sumInsured.clause.clauseId);
  });

  it('TC-R8-03 passes at the remaining SI when part is used', () => {
    // Remaining 30000000 − 10000000 = 20000000.
    expect(run(30_000_000, 10_000_000, 20_000_000).deductionPaise).toBe(0);
  });

  it('TC-R8-04 caps 1 paise over the remaining SI', () => {
    expect(run(30_000_000, 10_000_000, 20_000_001).deductionPaise).toBe(1);
  });

  it('TC-R8-05 is unknown when the SI is missing', () => {
    const r = run(null, 0, 1_000_000);
    expect(r.outcome).toBe('unknown');
    expect(r.missingFacts).toContain('sum_insured');
  });

  it('TC-R8-06 is unknown when the SI used is missing', () => {
    const r = run(30_000_000, null, 1_000_000);
    expect(r.outcome).toBe('unknown');
    expect(r.missingFacts).toContain('sum_insured_used');
  });
});
