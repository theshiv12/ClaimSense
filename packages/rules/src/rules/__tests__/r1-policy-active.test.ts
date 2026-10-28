import { describe, expect, it } from 'vitest';
import { facts, testPlan } from '../../../test/factories';
import { r1PolicyActive } from '../r1-policy-active';

// docs/rules-spec.md R1: passes when policyStartDate ≤ admissionDate ≤ policyEndDate (both inclusive).
// Policy year in facts(): 2026-03-12 .. 2027-03-11.
const run = (admissionDate: string) => r1PolicyActive(facts({ admissionDate }), testPlan());

describe('R1 policy active', () => {
  it('TC-R1-01 fails the day before the policy starts', () => {
    expect(run('2026-03-11').outcome).toBe('fail');
  });

  it('TC-R1-02 passes on the start date (inclusive)', () => {
    expect(run('2026-03-12').outcome).toBe('pass');
  });

  it('TC-R1-03 passes on the end date (inclusive)', () => {
    expect(run('2027-03-11').outcome).toBe('pass');
  });

  it('TC-R1-04 fails the day after the policy ends', () => {
    expect(run('2027-03-12').outcome).toBe('fail');
  });

  it('TC-R1-05 is unknown when the policy end date is missing', () => {
    const r = r1PolicyActive(facts({ policyEndDate: null }), testPlan());
    expect(r.outcome).toBe('unknown');
    expect(r.missingFacts).toContain('policy_end_date');
  });
});
