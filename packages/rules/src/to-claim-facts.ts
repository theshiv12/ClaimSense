import { FACT_VALUE_SCHEMAS, type ClaimFacts, type Fact, type FactKey, type FactValueOf } from '@claimsense/shared';

/** docs/rules-spec.md "Usable facts". Anything else is unknown (null) to the engine. */
export const isUsable = (f: Fact): boolean =>
  f.value !== null &&
  (f.source !== 'document' ||
    f.confirmedByUser ||
    (f.status === 'found' && (f.verification === 'exact' || f.verification === 'fuzzy') && f.confidence !== 'low'));

const groupBy = <K>(list: Fact[], keyOf: (f: Fact) => K) => {
  const groups = new Map<K, Fact[]>();
  for (const f of list) groups.set(keyOf(f), [...(groups.get(keyOf(f)) ?? []), f]);
  return groups;
};

const RANK: Record<Fact['source'], number> = { document: 0, 'user-stated': 1, 'user-corrected': 2 };

/** The facts of the best-ranked source present: a user correction beats a statement beats a document. */
const topRanked = (list: Fact[]) => {
  const top = Math.max(...list.map((f) => RANK[f.source]));
  return list.filter((f) => RANK[f.source] === top);
};

/** One value per key. Document facts that disagree, with no user fact to settle them, are unknown. */
const pick = (list: Fact[]): Fact['value'] => {
  const top = topRanked(list);
  if (top[0]!.source !== 'document') return top.at(-1)!.value;
  return top.every((f) => f.value === top[0]!.value) ? top[0]!.value : null;
};

/** Line items per head from the best-ranked source; one head from two documents → bill unknown. */
const lineItems = (usable: Fact[]): ClaimFacts['bill']['lineItems'] => {
  const byHead = groupBy(
    usable.filter((f) => f.key === 'bill_line_item' && f.head !== 'none' && typeof f.value === 'number'),
    (f) => f.head,
  );
  const chosen = [...byHead.values()].map(topRanked);
  const conflict = chosen.some((top) => top[0]!.source === 'document' && new Set(top.map((f) => f.documentId)).size > 1);
  if (conflict) return [];
  return usable.filter((f) => chosen.some((top) => top.includes(f))).map((f) => ({ head: f.head, amountPaise: f.value as number }));
};

/** Turns stored facts into engine input (docs/rules-spec.md "Usable facts"). */
export const toClaimFacts = (facts: Fact[], planId: string): ClaimFacts => {
  const usable = facts.filter(isUsable);
  const byKey = groupBy(usable, (f) => f.key);
  const get = <K extends FactKey>(key: K) => {
    const list = byKey.get(key);
    const parsed = FACT_VALUE_SCHEMAS[key].safeParse(list ? pick(list) : null);
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
      lineItems: lineItems(usable),
    },
  };
};
