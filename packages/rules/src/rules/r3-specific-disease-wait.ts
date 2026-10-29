import type { ClaimFacts, PlanConfig } from '@claimsense/shared';
import { addMonths } from '../dates';
import { fail, missing, notApplicable, pass, unknown } from '../result';
import type { EligibilityRule } from '../types';

/** Engine decision 6: icd10 prefix, or a case-insensitive keyword substring of the diagnosis. */
const listedCondition = (f: ClaimFacts, plan: PlanConfig) => {
  const icd = f.icd10?.trim().toUpperCase() ?? '';
  const dx = f.diagnosis?.toLowerCase() ?? '';
  return plan.specificDiseaseWait.conditions.find(
    (c) =>
      (icd !== '' && c.icd10Prefixes.some((p) => icd.startsWith(p.toUpperCase()))) ||
      (dx !== '' && c.keywords.some((k) => dx.includes(k.toLowerCase()))),
  );
};

/** R3: a listed condition is covered from inception + specificDiseaseWait.months (inclusive). */
export const r3SpecificDiseaseWait: EligibilityRule = (f, plan) => {
  const { months, accidentExempt, clause } = plan.specificDiseaseWait;
  const b = {
    ruleId: 'R3' as const,
    clause,
    usedFacts: ['diagnosis' as const, 'diagnosis_icd10' as const, 'first_inception_date' as const, 'admission_date' as const],
  };
  if (f.diagnosis === null && f.icd10 === null) return unknown(b, ['diagnosis']);
  const condition = listedCondition(f, plan);
  if (!condition) return notApplicable(b, 'R3_NOT_LISTED');

  const { firstInceptionDate: inception, admissionDate: adm } = f;
  if (inception === null || adm === null)
    return unknown(b, missing([['first_inception_date', inception], ['admission_date', adm]]));
  const waitEnds = addMonths(inception, months);
  const params = { condition: condition.label, waitEnds, months };
  if (adm >= waitEnds) return pass(b, 'R3_AFTER_WAIT', params);
  if (!accidentExempt) return fail(b, 'R3_WITHIN_WAIT', params);
  if (f.isAccident === null) return unknown(b, ['is_accident']);
  return f.isAccident ? pass(b, 'R3_ACCIDENT_EXEMPT', params) : fail(b, 'R3_WITHIN_WAIT', params);
};
