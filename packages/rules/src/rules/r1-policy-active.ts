import { fail, missing, pass, unknown } from '../result';
import type { EligibilityRule } from '../types';

/** R1: policyStartDate ≤ admissionDate ≤ policyEndDate. Cites the schedule, so no plan clause. */
export const r1PolicyActive: EligibilityRule = (f) => {
  const b = { ruleId: 'R1' as const, clause: null, usedFacts: ['policy_start_date' as const, 'policy_end_date' as const, 'admission_date' as const] };
  const { policyStartDate: start, policyEndDate: end, admissionDate: adm } = f;
  if (start === null || end === null || adm === null)
    return unknown(b, missing([['policy_start_date', start], ['policy_end_date', end], ['admission_date', adm]]));
  const params = { policyStartDate: start, policyEndDate: end, admissionDate: adm };
  return start <= adm && adm <= end ? pass(b, 'R1_POLICY_ACTIVE', params) : fail(b, 'R1_OUTSIDE_POLICY_PERIOD', params);
};
