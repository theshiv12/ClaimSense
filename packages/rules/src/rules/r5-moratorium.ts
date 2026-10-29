import { addMonths } from '../dates';
import { fail, notApplicable, pass } from '../result';
import type { EligibilityRule } from '../types';

/** R5 (Engine decision 1): an undisclosed PED fails until moratorium.months of cover; missing → n/a. */
export const r5Moratorium: EligibilityRule = (f, plan) => {
  const { months, clause } = plan.moratorium;
  const b = {
    ruleId: 'R5' as const,
    clause,
    usedFacts: ['ped_exists' as const, 'ped_disclosed' as const, 'first_inception_date' as const, 'admission_date' as const],
  };
  const { firstInceptionDate: inception, admissionDate: adm } = f;
  if (f.ped.exists !== true || f.ped.disclosed !== false || inception === null || adm === null)
    return notApplicable(b, 'R5_NOT_APPLICABLE');
  const moratoriumFrom = addMonths(inception, months);
  const params = { moratoriumFrom, months };
  return adm >= moratoriumFrom ? pass(b, 'R5_MORATORIUM_REACHED', params) : fail(b, 'R5_UNDISCLOSED_PED', params);
};
