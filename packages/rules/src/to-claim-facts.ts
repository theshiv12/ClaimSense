import { FACT_VALUE_SCHEMAS, type ClaimFacts, type Fact, type FactKey, type FactValueOf } from '@claimsense/shared';

/** docs/rules-spec.md "Usable facts". Anything else is unknown (null) to the engine. */
export const isUsable = (f: Fact): boolean =>
  f.value !== null &&
  (f.source !== 'document' ||
    f.confirmedByUser ||
    (f.status === 'found' && (f.verification === 'exact' || f.verification === 'fuzzy') && f.confidence !== 'low'));

const RANK: Record<Fact['source'], number> = { document: 0, 'user-stated': 1, 'user-corrected': 2 };

/** Turns stored facts into engine input. For one key, a user correction beats a statement beats a document. */
export const toClaimFacts = (facts: Fact[], planId: string): ClaimFacts => {
  const usable = facts.filter(isUsable);
  const best = new Map<FactKey, Fact>();
  for (const f of usable) {
    const current = best.get(f.key);
    if (!current || RANK[f.source] >= RANK[current.source]) best.set(f.key, f);
  }
  const get = <K extends FactKey>(key: K) => {
    const parsed = FACT_VALUE_SCHEMAS[key].safeParse(best.get(key)?.value);
    return (parsed.success ? parsed.data : null) as FactValueOf<K> | null;
  };

  return {
    planId,
    policyStartDate: get('policy_start_date'),
    policyEndDate: get('policy_end_date'),
    firstInceptionDate: get('first_inception_date'),
    sumInsuredPaise: get('sum_insured'),
    sumInsuredUsedPaise: get('sum_insured_used'),
    ageAtEntry: get('age_at_entry'),
    admissionDate: get('admission_date'),
    dischargeDate: get('discharge_date'),
    diagnosis: get('diagnosis'),
    icd10: get('diagnosis_icd10'),
    isAccident: get('is_accident'),
    ped: {
      exists: get('ped_exists'),
      condition: get('ped_condition'),
      firstDiagnosedDate: get('ped_first_diagnosed_date'),
      disclosed: get('ped_disclosed'),
    },
    room: { category: get('room_category'), rentPerDayPaise: get('room_rent_per_day'), days: get('room_days') },
    bill: {
      totalPaise: get('bill_total'),
      lineItems: usable
        .filter((f) => f.key === 'bill_line_item' && f.head !== 'none' && typeof f.value === 'number')
        .map((f) => ({ head: f.head, amountPaise: f.value as number })),
    },
  };
};
