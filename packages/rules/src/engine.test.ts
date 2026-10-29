import { describe, expect, it } from 'vitest';
import { EstimateSchema } from '@claimsense/shared';
import { caseFacts, testPlan } from '../test/factories';
import { estimate } from './engine';

// docs/rules-spec.md "Order": R1–R5 eligibility (any fail → payable 0), then non-payables removed,
// then R6 → R7 → R8 on the running amount. Case B bill (paise) on plan T.
const plan = testPlan();
const byRule = (e: ReturnType<typeof estimate>, id: string) => e.waterfall.find((w) => w.ruleId === id);

describe('Engine waterfall', () => {
  it('TC-ENG-01 applies non-payables, then R6, R7, R8 in order on the running amount', () => {
    // Claimed 24000000. Non-payables −960000 → 23040000.
    // R6 −2460000 (Case B) → 20580000. R7 age 61: 20580000 × 2000 ÷ 10000 = 4116000 → 16464000.
    // R8 SI 15000000, used 0: 16464000 − 15000000 = 1464000 → 15000000.
    // Out of pocket 24000000 − 15000000 = 9000000 (= 960000 + 2460000 + 4116000 + 1464000).
    const e = estimate(caseFacts('B', { ageAtEntry: 61, sumInsuredPaise: 15_000_000 }), plan, 1);
    expect(e.waterfall.map((w) => w.ruleId)).toEqual(['R6', 'R7', 'R8']);
    expect(byRule(e, 'R6')).toMatchObject({ beforePaise: 23_040_000, afterPaise: 20_580_000 });
    expect(byRule(e, 'R7')).toMatchObject({ beforePaise: 20_580_000, afterPaise: 16_464_000 });
    expect(byRule(e, 'R8')).toMatchObject({ beforePaise: 16_464_000, afterPaise: 15_000_000 });
    expect(e.payablePaise).toBe(15_000_000);
    expect(e.outOfPocketPaise).toBe(9_000_000);
  });

  it('TC-ENG-02 removes non-payable heads before R6 instead of proportioning them', () => {
    // Consumables 960000 removed; R6 base 24000000 − 960000 = 23040000.
    const e = estimate(caseFacts('B'), plan, 1);
    expect(e.nonPayablePaise).toBe(960_000);
    expect(byRule(e, 'R6')?.beforePaise).toBe(23_040_000);
  });

  it('TC-ENG-03 pays 0 when an eligibility rule fails, but still shows the amount if eligible', () => {
    // Inception and policy start 2026-11-08; admission 2026-11-18 = day 10 < 30: R2 fails.
    // payableIfEligible = Case B payable 20580000; out of pocket = 24000000 − 0.
    const e = estimate(
      caseFacts('B', { firstInceptionDate: '2026-11-08', policyStartDate: '2026-11-08', policyEndDate: '2027-11-07' }),
      plan,
      1,
    );
    expect(e.payablePaise).toBe(0);
    expect(e.payableIfEligiblePaise).toBe(20_580_000);
    expect(e.outOfPocketPaise).toBe(24_000_000);
  });

  it('TC-ENG-04 returns 8 results in order, clauses from the plan, and a valid Estimate', () => {
    const e = estimate(caseFacts('B'), plan, 1);
    expect(() => EstimateSchema.parse(e)).not.toThrow();
    expect(e.results.map((r) => r.ruleId)).toEqual(['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8']);
    const clauseOf = (id: string) => e.results.find((r) => r.ruleId === id)?.clause?.clauseId;
    expect(clauseOf('R2')).toBe(plan.initialWait.clause.clauseId);
    expect(clauseOf('R6')).toBe(plan.roomRent.clause?.clauseId);
    expect(clauseOf('R8')).toBe(plan.sumInsured.clause.clauseId);
    expect(e.planId).toBe(plan.planId);
  });

  it('TC-ENG-05 removes nothing when the plan lists no non-payable heads', () => {
    const noNonPayables = { ...plan, nonPayableHeads: { ...plan.nonPayableHeads, heads: [] } };
    const e = estimate(caseFacts('B'), noNonPayables, 1);
    expect(e.nonPayablePaise).toBe(0);
    expect(byRule(e, 'R6')?.beforePaise).toBe(24_000_000);
  });
});

// docs/rules-spec.md "Verdict": at_risk if any of R1–R5 fail or unknown; likely_partial if eligible and
// payable < claimed or any of R6–R8 unknown; likely_payable if eligible and payable = claimed.
describe('Verdict', () => {
  it('TC-VERDICT-01 is likely_payable when eligible and payable equals claimed (Case D)', () => {
    expect(estimate(caseFacts('D'), plan, 1).verdict).toBe('likely_payable');
  });

  it('TC-VERDICT-02 is likely_partial when eligible and payable is below claimed (Case B)', () => {
    expect(estimate(caseFacts('B'), plan, 1).verdict).toBe('likely_partial');
  });

  it('TC-VERDICT-03 is likely_partial when an amount rule is unknown, even at the full amount', () => {
    const d = caseFacts('D');
    expect(estimate({ ...d, room: { ...d.room, rentPerDayPaise: null } }, plan, 1).verdict).toBe('likely_partial');
  });

  it('TC-VERDICT-04 is at_risk when an eligibility rule is unknown', () => {
    const d = caseFacts('D');
    expect(estimate({ ...d, ped: { ...d.ped, exists: null } }, plan, 1).verdict).toBe('at_risk');
  });

  it('TC-VERDICT-05 is at_risk when an eligibility rule fails (Case A)', () => {
    expect(estimate(caseFacts('A'), plan, 1).verdict).toBe('at_risk');
  });
});
