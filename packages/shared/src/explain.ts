import type { FactKey } from './fact-key';
import type { RuleId, RuleResult } from './rule-result.schema';

// Plain-English text for amounts, dates and check results, shared by the web UI and the API (the chat builds
// its sources from the same sentences the user sees). Pure: no I/O.

/** ₹ with Indian grouping (₹2,05,800); paise shown only when not zero. */
export const formatInr = (paise: number): string => {
  const rupees = paise / 100;
  const whole = Number.isInteger(rupees);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(rupees);
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 'YYYY-MM-DD' → '18 Nov 2026' (calendar date, no time zone). */
export const formatDate = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number);
  return y && m && d ? `${d} ${MONTHS[m - 1]} ${y}` : iso;
};

export const FACT_LABELS: Record<FactKey, string> = {
  plan_uin: 'Plan UIN', policy_start_date: 'Policy start date', policy_end_date: 'Policy end date',
  first_inception_date: 'First inception date (continuous cover since)', sum_insured: 'Sum insured',
  sum_insured_used: 'Sum insured already used this year', age_at_entry: 'Age at entry',
  admission_date: 'Admission date', discharge_date: 'Discharge date', diagnosis: 'Diagnosis or procedure',
  diagnosis_icd10: 'ICD-10 code', is_accident: 'Caused by an accident', ped_exists: 'Had this condition before the policy (PED)',
  ped_condition: 'Pre-existing condition', ped_first_diagnosed_date: 'Condition first diagnosed on',
  ped_disclosed: 'PED declared to the insurer', room_category: 'Room type', room_rent_per_day: 'Room rent per day',
  room_days: 'Days in room', bill_total: 'Estimate total', bill_line_item: 'Bill line',
};

export const RULE_TITLES: Record<RuleId, string> = {
  R1: 'Policy is active on the admission date',
  R2: 'Initial waiting period',
  R3: 'Specific-disease waiting period',
  R4: 'Pre-existing disease waiting period',
  R5: 'Moratorium and disclosure',
  R6: 'Room rent limit',
  R7: 'Co-payment',
  R8: 'Sum insured left',
};

const p = (r: RuleResult, k: string) => r.params[k];
const date = (v: unknown) => (typeof v === 'string' ? formatDate(v) : '');
const money = (v: unknown) => (typeof v === 'number' ? formatInr(v) : '');

const MEDICAL_FIRST = ' Medical advice comes first: never delay treatment your doctor says you need because of cover.';
const WAITING = new Set(['R2_WITHIN_INITIAL_WAIT', 'R3_WITHIN_WAIT', 'R4_WITHIN_PED_WAIT']);

/** One plain-English sentence per reason code; the numbers come from the engine's params. */
export const explain = (r: RuleResult): string => reason(r) + (WAITING.has(r.reasonCode) ? MEDICAL_FIRST : '');

const reason = (r: RuleResult): string => {
  if (r.outcome === 'unknown') return `We need: ${r.missingFacts.map((k) => FACT_LABELS[k]).join(', ')}.`;
  switch (r.reasonCode) {
    case 'R1_POLICY_ACTIVE': return `Admission on ${date(p(r, 'admissionDate'))} is inside the policy period.`;
    case 'R1_OUTSIDE_POLICY_PERIOD': return `Admission on ${date(p(r, 'admissionDate'))} is outside ${date(p(r, 'policyStartDate'))} – ${date(p(r, 'policyEndDate'))}.`;
    case 'R2_AFTER_INITIAL_WAIT': return `The ${String(p(r, 'days'))}-day initial wait ended on ${date(p(r, 'waitEnds'))}.`;
    case 'R2_ACCIDENT_EXEMPT': return 'Inside the initial wait, but accidents are covered from day one.';
    case 'R2_WITHIN_INITIAL_WAIT': return `Illness claims are covered from ${date(p(r, 'waitEnds'))} (${String(p(r, 'days'))}-day initial wait).`;
    case 'R2_BEFORE_INCEPTION': return 'The admission is before the policy first started.';
    case 'R3_NOT_LISTED': return 'This treatment is not on the plan’s specific-disease waiting list.';
    case 'R3_AFTER_WAIT': return `Listed condition (${String(p(r, 'condition'))}); its ${String(p(r, 'months'))}-month wait ended on ${date(p(r, 'waitEnds'))}.`;
    case 'R3_ACCIDENT_EXEMPT': return 'Listed condition, but caused by an accident, so the wait does not apply.';
    case 'R3_WITHIN_WAIT': return `Listed condition (${String(p(r, 'condition'))}): covered from ${date(p(r, 'waitEnds'))} (${String(p(r, 'months'))}-month wait).`;
    case 'R4_NO_PED': return 'No pre-existing disease.';
    case 'R4_DIAGNOSED_AFTER_INCEPTION': return 'The condition was first diagnosed after the policy started, so it is not pre-existing.';
    case 'R4_AFTER_PED_WAIT': return `The ${String(p(r, 'months'))}-month PED wait ended on ${date(p(r, 'waitEnds'))}.`;
    case 'R4_WITHIN_PED_WAIT': return `Pre-existing disease: covered from ${date(p(r, 'waitEnds'))} (${String(p(r, 'months'))}-month wait).`;
    case 'R5_NOT_APPLICABLE': return 'No undisclosed pre-existing disease to consider.';
    case 'R5_MORATORIUM_REACHED': return `Continuous cover since past ${date(p(r, 'moratoriumFrom'))}: non-disclosure can be contested only for fraud.`;
    case 'R5_UNDISCLOSED_PED': return `An undisclosed pre-existing disease can lead to rejection until ${date(p(r, 'moratoriumFrom'))}.`;
    case 'R6_NO_CAP': case 'R6_NO_CAP_FOR_ROOM': return 'No room rent limit applies to this room.';
    case 'R6_WITHIN_CAP': return `Room rent ${money(p(r, 'rentPerDayPaise'))}/day is within the ${money(p(r, 'capPerDayPaise'))}/day limit.`;
    case 'R6_ROOM_WITHIN_CATEGORY': return 'The room is within the room type your sum insured allows.';
    case 'R6_ROOM_OVER_CAP': return `Room ${money(p(r, 'rentPerDayPaise'))}/day is over the ${money(p(r, 'capPerDayPaise'))}/day limit: room cut ${money(p(r, 'roomDeductionPaise'))}, other charges cut in proportion ${money(p(r, 'associatedDeductionPaise'))}.`;
    case 'R7_NO_CO_PAY': case 'R7_BELOW_CO_PAY_AGE': case 'R7_CO_PAY_ZERO': return 'No co-payment for this age at entry.';
    case 'R7_CO_PAY': return `Age at entry ${String(p(r, 'ageAtEntry'))}: you pay ${String(Number(p(r, 'bps')) / 100)}% of the claim.`;
    case 'R8_WITHIN_SUM_INSURED': return `Within the sum insured left (${money(p(r, 'remainingPaise'))}).`;
    case 'R8_OVER_SUM_INSURED': return `Only ${money(p(r, 'remainingPaise'))} of sum insured is left.`;
    default: return '';
  }
};
