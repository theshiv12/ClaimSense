import type { FactKey } from './fact-key';

/**
 * FR-6: the plain question asked for a fact the estimate still needs (at most 2 at a time, chosen by the
 * engine's pickClarifiers). The answer is saved as a user-stated fact; the form uses the fact's own input.
 */
export const CLARIFIER_QUESTIONS: Partial<Record<FactKey, string>> = {
  admission_date: 'When is the planned admission?',
  policy_start_date: 'When did this year’s policy start (on your policy schedule)?',
  policy_end_date: 'When does this year’s policy end?',
  first_inception_date: 'When did you first take this policy (continuous cover since)?',
  sum_insured: 'What is the sum insured on your policy schedule?',
  age_at_entry: 'How old was the patient when they first took this policy?',
  diagnosis: 'What is the planned treatment or diagnosis?',
  ped_exists: 'Did this condition start before the policy was first taken?',
  is_accident: 'Is the treatment needed because of an accident?',
  room_category: 'Which room type will you take?',
  room_rent_per_day: 'What is the room rent per day?',
  room_days: 'How many days in the room?',
  sum_insured_used: 'How much of this year’s sum insured has already been claimed?',
  ped_disclosed: 'Was this condition declared on the proposal form?',
  ped_first_diagnosed_date: 'When was the condition first diagnosed?',
  ped_condition: 'What was the earlier condition?',
};

export interface ClarifierView {
  key: FactKey;
  mode: 'ask' | 'confirm';
  question: string;
}
