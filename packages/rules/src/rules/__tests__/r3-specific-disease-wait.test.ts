import { describe, expect, it } from 'vitest';
import { facts, testPlan } from '../../../test/factories';
import { r3SpecificDiseaseWait } from '../r3-specific-disease-wait';

// docs/rules-spec.md R3 + Boundaries: a wait of N months ends on the same calendar date N months
// after inception, inclusive; month-end clamps (date-fns addMonths). I = 2025-01-10, 24 months → 2027-01-10.
// Matching (Engine decision 6): icd10 prefix, or case-insensitive keyword substring of diagnosis.
const plan = testPlan(); // 24 months, accidentExempt true, cataract H25, joint replacement M17, clause T-3
const cataract = (admissionDate: string, patch = {}) =>
  r3SpecificDiseaseWait(facts({ diagnosis: 'Senile cataract', icd10: 'H25.9', admissionDate, ...patch }), plan);

describe('R3 specific-disease waiting period', () => {
  it('TC-R3-01 fails one day before 24 months and cites the clause', () => {
    const r = cataract('2027-01-09');
    expect(r.outcome).toBe('fail');
    expect(r.clause?.clauseId).toBe(plan.specificDiseaseWait.clause.clauseId);
  });

  it('TC-R3-02 passes at exactly 24 months (inclusive)', () => {
    expect(cataract('2027-01-10').outcome).toBe('pass');
  });

  it('TC-R3-03 passes the day after 24 months', () => {
    expect(cataract('2027-01-11').outcome).toBe('pass');
  });

  it('TC-R3-04 passes a listed condition caused by an accident (exemption)', () => {
    // 14 months: I + 14 months = 2026-03-10.
    expect(cataract('2026-03-10', { isAccident: true }).outcome).toBe('pass');
  });

  it('TC-R3-05 is not applicable (pass) for a diagnosis not on the list', () => {
    // 3 months: 2025-04-10.
    const r = r3SpecificDiseaseWait(facts({ diagnosis: 'Acute appendicitis', icd10: 'K35.8', admissionDate: '2025-04-10' }), plan);
    expect(r.outcome).toBe('pass');
    expect(r.applicable).toBe(false);
  });

  it('TC-R3-06 is unknown, never pass, when the diagnosis is missing', () => {
    const r = r3SpecificDiseaseWait(facts({ diagnosis: null, icd10: null, admissionDate: '2025-04-10' }), plan);
    expect(r.outcome).toBe('unknown');
    expect(r.missingFacts).toContain('diagnosis');
  });

  it('TC-R3-07 counts ported cover: 12 months old policy + 13 months this one passes', () => {
    // firstInceptionDate carries porting: old policy from 2025-01-10, this policy from 2026-01-10;
    // admission 2027-02-10 is 25 months after first inception.
    expect(cataract('2027-02-10', { policyStartDate: '2026-01-10', policyEndDate: '2027-01-09' }).outcome).toBe('pass');
  });

  it("TC-R3-08 follows each plan's own period", () => {
    // Same cataract at 14 months (2026-03-10): T (24 months) fails; plan 2 (12 months) passes.
    const plan2 = { ...plan, specificDiseaseWait: { ...plan.specificDiseaseWait, months: 12 } };
    const f = facts({ diagnosis: 'Senile cataract', icd10: 'H25.9', admissionDate: '2026-03-10' });
    expect(r3SpecificDiseaseWait(f, plan).outcome).toBe('fail');
    expect(r3SpecificDiseaseWait(f, plan2).outcome).toBe('pass');
  });

  it('TC-R3-09 fails at month 23', () => {
    expect(cataract('2026-12-10').outcome).toBe('fail');
  });

  it('TC-R3-10 passes at month 25', () => {
    expect(cataract('2027-02-10').outcome).toBe('pass');
  });

  it('TC-R3-11 fails the day before a month-end-clamped date', () => {
    // I = 2024-02-29; + 24 months = 2026-02-28 (no 29 Feb in 2026), so 2026-02-27 is one day short.
    expect(cataract('2026-02-27', { firstInceptionDate: '2024-02-29' }).outcome).toBe('fail');
  });

  it('TC-R3-12 passes on the month-end-clamped date', () => {
    expect(cataract('2026-02-28', { firstInceptionDate: '2024-02-29' }).outcome).toBe('pass');
  });

  it('TC-R3-13 matches a listed condition by keyword when icd10 is missing', () => {
    // "Total knee joint replacement" contains "joint replacement"; 14 months (2026-03-10) < 24.
    const r = r3SpecificDiseaseWait(
      facts({ diagnosis: 'Total knee joint replacement', icd10: null, admissionDate: '2026-03-10' }),
      plan,
    );
    expect(r.outcome).toBe('fail');
  });
});
