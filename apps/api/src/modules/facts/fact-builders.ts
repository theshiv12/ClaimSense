import { FACT_VALUE_SCHEMAS, type BillHead, type ClaimFacts, type Fact, type FactKey, type FactValue } from '@claimsense/shared';

/** A fact the user typed: no document, no quote, nothing to verify (golden rule 3). */
export const userFact = (key: FactKey, value: FactValue, head: BillHead = 'none', source: Fact['source'] = 'user-stated'): Fact => ({
  key,
  head,
  value,
  status: 'found',
  source,
  documentId: null,
  sourceQuote: null,
  page: null,
  confidence: 'high',
  verification: 'none',
  confirmedByUser: true,
});

/** True when `value` has the type `key` holds (dates YYYY-MM-DD, money in paise…). */
export const validValue = (key: FactKey, head: BillHead, value: FactValue) =>
  value !== null && FACT_VALUE_SCHEMAS[key].safeParse(value).success && (key === 'bill_line_item') === (head !== 'none');

/** Sample cases: ClaimFacts back into user-stated facts, one per known value. */
export const factsFromClaimFacts = (f: ClaimFacts): Fact[] => {
  const pairs: [FactKey, FactValue][] = [
    ['policy_start_date', f.policyStartDate],
    ['policy_end_date', f.policyEndDate],
    ['first_inception_date', f.firstInceptionDate],
    ['sum_insured', f.sumInsuredPaise],
    ['sum_insured_used', f.sumInsuredUsedPaise],
    ['age_at_entry', f.ageAtEntry],
    ['admission_date', f.admissionDate],
    ['discharge_date', f.dischargeDate],
    ['diagnosis', f.diagnosis],
    ['diagnosis_icd10', f.icd10],
    ['is_accident', f.isAccident],
    ['ped_exists', f.ped.exists],
    ['ped_condition', f.ped.condition],
    ['ped_first_diagnosed_date', f.ped.firstDiagnosedDate],
    ['ped_disclosed', f.ped.disclosed],
    ['room_category', f.room.category],
    ['room_rent_per_day', f.room.rentPerDayPaise],
    ['room_days', f.room.days],
    ['bill_total', f.bill.totalPaise],
  ];
  return [
    ...pairs.filter(([, v]) => v !== null).map(([k, v]) => userFact(k, v)),
    ...f.bill.lineItems.map((i) => userFact('bill_line_item', i.amountPaise, i.head)),
  ];
};
