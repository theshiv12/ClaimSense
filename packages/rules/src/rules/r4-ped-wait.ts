import { addMonths } from '../dates';
import { fail, missing, notApplicable, pass, unknown } from '../result';
import type { EligibilityRule } from '../types';

/** R4: no PED, or first diagnosed after inception, or admission ≥ inception + pedWait.months. */
export const r4PedWait: EligibilityRule = (f, plan) => {
  const { months, clause } = plan.pedWait;
  const b = {
    ruleId: 'R4' as const,
    clause,
    usedFacts: ['ped_exists' as const, 'ped_first_diagnosed_date' as const, 'first_inception_date' as const, 'admission_date' as const],
  };
  if (f.ped.exists === null) return unknown(b, ['ped_exists']);
  if (!f.ped.exists) return notApplicable(b, 'R4_NO_PED');

  const { firstInceptionDate: inception, admissionDate: adm } = f;
  if (inception === null || adm === null)
    return unknown(b, missing([['first_inception_date', inception], ['admission_date', adm]]));
  const diagnosed = f.ped.firstDiagnosedDate;
  if (diagnosed !== null && diagnosed > inception) return notApplicable(b, 'R4_DIAGNOSED_AFTER_INCEPTION');

  const waitEnds = addMonths(inception, months);
  const params = { waitEnds, months };
  if (adm >= waitEnds) return pass(b, 'R4_AFTER_PED_WAIT', params);
  return diagnosed === null ? unknown(b, ['ped_first_diagnosed_date']) : fail(b, 'R4_WITHIN_PED_WAIT', params);
};
