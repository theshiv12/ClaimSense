import type { FactKey, RuleResult } from '@claimsense/shared';

/**
 * Facts one short question can settle, in the order asked when they settle the same number of checks
 * (FR-6). Bill lines and totals need the hospital's estimate, not a question, so they are never asked.
 */
const ASKABLE: FactKey[] = [
  'admission_date', 'policy_start_date', 'policy_end_date', 'first_inception_date', 'sum_insured', 'age_at_entry',
  'diagnosis', 'ped_exists', 'is_accident', 'room_category', 'room_rent_per_day', 'room_days', 'sum_insured_used',
  'ped_disclosed', 'ped_first_diagnosed_date', 'ped_condition',
];
const MAX_QUESTIONS = 2;

export interface Clarifier {
  key: FactKey;
  /** "confirm" when a document already gave a value that is waiting for the user's check. */
  mode: 'ask' | 'confirm';
}

/** At most 2 questions: the missing facts that would settle the most Unknown checks (FR-6). */
export const pickClarifiers = (results: RuleResult[], pending: Set<FactKey>): Clarifier[] => {
  const counts = new Map<FactKey, number>();
  for (const r of results) {
    if (r.outcome !== 'unknown') continue;
    for (const k of r.missingFacts) if (ASKABLE.includes(k)) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a, n], [b, m]) => m - n || ASKABLE.indexOf(a) - ASKABLE.indexOf(b))
    .slice(0, MAX_QUESTIONS)
    .map(([key]) => ({ key, mode: pending.has(key) ? 'confirm' : 'ask' }));
};
