import { describe, expect, it } from 'vitest';
import type { ClaimFacts } from '@claimsense/shared';
import { facts, testPlan } from '../../../test/factories';
import { r5Moratorium } from '../r5-moratorium';

// docs/rules-spec.md R5 + Engine decision 1: an undisclosed PED fails R5 while continuous cover is
// under moratorium.months, and passes from that date (inclusive). Missing → not applicable.
// I = 2025-01-10; 60 months → 2030-01-10.
const plan = testPlan(); // moratorium.months 60, clause T-5
const run = (admissionDate: string, disclosed: boolean | null) => {
  const ped: ClaimFacts['ped'] = { exists: true, condition: 'Hypertension', firstDiagnosedDate: '2024-06-01', disclosed };
  return r5Moratorium(facts({ admissionDate, ped }), plan);
};

describe('R5 moratorium', () => {
  it('TC-R5-01 fails an undisclosed PED at month 59 and cites the moratorium clause', () => {
    const r = run('2029-12-10', false);
    expect(r.outcome).toBe('fail');
    expect(r.clause?.clauseId).toBe(plan.moratorium.clause.clauseId);
  });

  it('TC-R5-02 passes an undisclosed PED at month 60 (inclusive)', () => {
    expect(run('2030-01-10', false).outcome).toBe('pass');
  });

  it('TC-R5-03 passes an undisclosed PED at month 61', () => {
    expect(run('2030-02-10', false).outcome).toBe('pass');
  });

  it('TC-R5-04 is not applicable when the PED was disclosed', () => {
    // Month 40: 2028-05-10.
    const r = run('2028-05-10', true);
    expect(r.outcome).toBe('pass');
    expect(r.applicable).toBe(false);
  });

  it('TC-R5-05 is not applicable (not unknown) when disclosure is unknown', () => {
    const r = run('2028-05-10', null);
    expect(r.outcome).toBe('pass');
    expect(r.applicable).toBe(false);
  });
});
