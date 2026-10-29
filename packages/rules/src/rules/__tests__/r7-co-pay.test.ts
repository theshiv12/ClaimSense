import { describe, expect, it } from 'vitest';
import { facts, testPlan } from '../../../test/factories';
import { r7CoPay } from '../r7-co-pay';

// docs/rules-spec.md R7: ageAtEntry below every tier → none; otherwise deduct the tier's bps of the
// running amount, floor(running × bps ÷ 10000).
const plan = testPlan(); // tier: minAgeAtEntry 61 → 2000 bps, clause T-7

describe('R7 co-pay', () => {
  it('TC-R7-01 takes no co-pay at age 60', () => {
    const r = r7CoPay(facts({ ageAtEntry: 60 }), plan, 20_580_000);
    expect(r.outcome).toBe('pass');
    expect(r.deductionPaise).toBe(0);
  });

  it('TC-R7-02 takes 20% at age 61', () => {
    // 20580000 × 2000 ÷ 10000 = 4116000.
    const r = r7CoPay(facts({ ageAtEntry: 61 }), plan, 20_580_000);
    expect(r.outcome).toBe('deduction');
    expect(r.deductionPaise).toBe(4_116_000);
    expect(r.clause?.clauseId).toBe(plan.coPay.clause?.clauseId);
  });

  it('TC-R7-03 floors the co-pay', () => {
    // 1234567 × 2000 ÷ 10000 = 246913.4 → 246913.
    expect(r7CoPay(facts({ ageAtEntry: 61 }), plan, 1_234_567).deductionPaise).toBe(246_913);
  });

  it('TC-R7-04 is unknown when age at entry is missing', () => {
    const r = r7CoPay(facts({ ageAtEntry: null }), plan, 20_580_000);
    expect(r.outcome).toBe('unknown');
    expect(r.missingFacts).toContain('age_at_entry');
  });

  it('TC-R7-05 takes no co-pay on a plan without tiers', () => {
    const noCoPay = { ...plan, coPay: { ...plan.coPay, tiers: [] } };
    const r = r7CoPay(facts({ ageAtEntry: 70 }), noCoPay, 20_580_000);
    expect(r.outcome).toBe('pass');
    expect(r.deductionPaise).toBe(0);
  });
});
