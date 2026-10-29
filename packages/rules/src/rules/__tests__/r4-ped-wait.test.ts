import { describe, expect, it } from 'vitest';
import type { ClaimFacts } from '@claimsense/shared';
import { facts, testPlan } from '../../../test/factories';
import { r4PedWait } from '../r4-ped-wait';

// docs/rules-spec.md R4: passes when no PED, or PED first diagnosed after inception, or admission ≥
// inception + pedWait.months (inclusive). Engine decision 1: R4 checks only the waiting period.
// I = 2025-01-10; 36 months → 2028-01-10.
const plan = testPlan(); // pedWait.months 36, clause T-4
const ped = (p: Partial<ClaimFacts['ped']> = {}): ClaimFacts['ped'] => ({
  exists: true,
  condition: 'Type 2 diabetes',
  firstDiagnosedDate: '2024-06-01', // before inception
  disclosed: true,
  ...p,
});
const run = (admissionDate: string, p: Partial<ClaimFacts['ped']> = {}, pl = plan) =>
  r4PedWait(facts({ admissionDate, ped: ped(p) }), pl);

describe('R4 pre-existing disease waiting period', () => {
  it('TC-R4-01 fails at month 35 and cites the PED clause', () => {
    const r = run('2027-12-10');
    expect(r.outcome).toBe('fail');
    expect(r.clause?.clauseId).toBe(plan.pedWait.clause.clauseId);
  });

  it('TC-R4-02 passes at month 36 (inclusive)', () => {
    expect(run('2028-01-10').outcome).toBe('pass');
  });

  it('TC-R4-03 passes at month 37', () => {
    expect(run('2028-02-10').outcome).toBe('pass');
  });

  it('TC-R4-04 passes when the condition was first diagnosed after inception', () => {
    // Diagnosed 2025-06-01 > I; admission month 5 (2025-06-10).
    expect(run('2025-06-10', { firstDiagnosedDate: '2025-06-01' }).outcome).toBe('pass');
  });

  it('TC-R4-05 passes when there is no PED', () => {
    expect(run('2025-06-10', { exists: false }).outcome).toBe('pass');
  });

  it('TC-R4-06 is unknown when PED status is unknown', () => {
    const r = run('2025-06-10', { exists: null });
    expect(r.outcome).toBe('unknown');
    expect(r.missingFacts).toContain('ped_exists');
  });

  it('TC-R4-07 is unknown inside the wait when the PED diagnosis date is unknown', () => {
    // Month 20: 2026-09-10 < 2028-01-10.
    const r = run('2026-09-10', { firstDiagnosedDate: null });
    expect(r.outcome).toBe('unknown');
    expect(r.missingFacts).toContain('ped_first_diagnosed_date');
  });

  it('TC-R4-08 follows the plan: month 40 passes a 36-month wait, fails a 48-month wait', () => {
    // Month 40: 2028-05-10. 36-month end 2028-01-10 ≤ adm; 48-month end 2029-01-10 > adm.
    const plan48 = { ...plan, pedWait: { ...plan.pedWait, months: 48 } };
    expect(run('2028-05-10').outcome).toBe('pass');
    expect(run('2028-05-10', {}, plan48).outcome).toBe('fail');
  });
});
