import { describe, expect, it } from 'vitest';
import { facts, testPlan } from '../../../test/factories';
import { r2InitialWait } from '../r2-initial-wait';

// docs/rules-spec.md R2 + Boundaries: "admission on inception + 30 days passes; on day 29 it fails".
// I = 2025-01-10. Jan has 31 days: I + 21 = 31 Jan, so I + 29 = 8 Feb, I + 30 = 9 Feb, I + 31 = 10 Feb.
const plan = testPlan(); // initialWait.days 30, accidentExempt true, clause T-2

describe('R2 initial waiting period', () => {
  it('TC-R2-01 fails on day 29 and cites the initial-wait clause', () => {
    const r = r2InitialWait(facts({ admissionDate: '2025-02-08' }), plan);
    expect(r.outcome).toBe('fail');
    expect(r.clause?.clauseId).toBe(plan.initialWait.clause.clauseId);
  });

  it('TC-R2-02 passes on day 30 (inclusive)', () => {
    expect(r2InitialWait(facts({ admissionDate: '2025-02-09' }), plan).outcome).toBe('pass');
  });

  it('TC-R2-03 passes on day 31', () => {
    expect(r2InitialWait(facts({ admissionDate: '2025-02-10' }), plan).outcome).toBe('pass');
  });

  it('TC-R2-04 passes an accident inside the wait when the plan exempts accidents', () => {
    // Day 5: I + 5 = 2025-01-15.
    expect(r2InitialWait(facts({ admissionDate: '2025-01-15', isAccident: true }), plan).outcome).toBe('pass');
  });

  it('TC-R2-05 fails an accident inside the wait when the plan does not exempt accidents', () => {
    const strict = { ...plan, initialWait: { ...plan.initialWait, accidentExempt: false } };
    expect(r2InitialWait(facts({ admissionDate: '2025-01-15', isAccident: true }), strict).outcome).toBe('fail');
  });

  it('TC-R2-06 is unknown, never pass, inside the wait when accident is unknown', () => {
    const r = r2InitialWait(facts({ admissionDate: '2025-01-15', isAccident: null }), plan);
    expect(r.outcome).toBe('unknown');
    expect(r.missingFacts).toContain('is_accident');
  });

  it('TC-R2-07 passes after the wait even when accident is unknown', () => {
    expect(r2InitialWait(facts({ admissionDate: '2025-02-10', isAccident: null }), plan).outcome).toBe('pass');
  });

  it('TC-R2-08 is unknown when the first inception date is missing', () => {
    const r = r2InitialWait(facts({ firstInceptionDate: null, admissionDate: '2025-02-10' }), plan);
    expect(r.outcome).toBe('unknown');
    expect(r.missingFacts).toContain('first_inception_date');
  });
});
