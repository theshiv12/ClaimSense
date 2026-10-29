import { addDays } from '../dates';
import { fail, missing, pass, unknown } from '../result';
import type { EligibilityRule } from '../types';

/** R2: admission ≥ inception + initialWait.days (inclusive), or an exempt accident. */
export const r2InitialWait: EligibilityRule = (f, plan) => {
  const { days, accidentExempt, clause } = plan.initialWait;
  const b = { ruleId: 'R2' as const, clause, usedFacts: ['first_inception_date' as const, 'admission_date' as const, 'is_accident' as const] };
  const { firstInceptionDate: inception, admissionDate: adm } = f;
  if (inception === null || adm === null)
    return unknown(b, missing([['first_inception_date', inception], ['admission_date', adm]]));
  if (adm < inception) return fail(b, 'R2_BEFORE_INCEPTION', { firstInceptionDate: inception, admissionDate: adm });

  const waitEnds = addDays(inception, days);
  const params = { waitEnds, days };
  if (adm >= waitEnds) return pass(b, 'R2_AFTER_INITIAL_WAIT', params);
  if (!accidentExempt) return fail(b, 'R2_WITHIN_INITIAL_WAIT', params);
  if (f.isAccident === null) return unknown(b, ['is_accident']);
  return f.isAccident ? pass(b, 'R2_ACCIDENT_EXEMPT', params) : fail(b, 'R2_WITHIN_INITIAL_WAIT', params);
};
