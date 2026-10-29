import type { BillHead, ErrorCode, FactKey, FactValue, RoomCategory, RuleId, RuleResult, Verdict } from '@claimsense/shared';
import { formatDate, formatInr } from './format';

export type FactKind = 'money' | 'date' | 'bool' | 'int' | 'room' | 'text';

export const FACT_KIND: Record<FactKey, FactKind> = {
  plan_uin: 'text', policy_start_date: 'date', policy_end_date: 'date', first_inception_date: 'date',
  sum_insured: 'money', sum_insured_used: 'money', age_at_entry: 'int', admission_date: 'date',
  discharge_date: 'date', diagnosis: 'text', diagnosis_icd10: 'text', is_accident: 'bool', ped_exists: 'bool',
  ped_condition: 'text', ped_first_diagnosed_date: 'date', ped_disclosed: 'bool', room_category: 'room',
  room_rent_per_day: 'money', room_days: 'int', bill_total: 'money', bill_line_item: 'money',
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

export const HEAD_LABELS: Record<BillHead, string> = {
  none: '—', room: 'Room', icu: 'ICU', nursing: 'Nursing', surgeon: 'Surgeon fees', consultation: 'Consultation',
  ot: 'OT charges', pharmacy: 'Pharmacy', consumables: 'Consumables', implants: 'Implants', diagnostics: 'Diagnostics', other: 'Other',
};

export const ROOM_LABELS: Record<RoomCategory, string> = {
  general: 'General ward', shared: 'Twin sharing', single: 'Single room', deluxe: 'Deluxe room', suite: 'Suite', icu: 'ICU',
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

// Never "approved" (CLAUDE.md golden rule 10): only the insurer decides.
export const VERDICT_LABELS: Record<Verdict, { label: string; tone: 'pass' | 'warn' | 'risk' }> = {
  likely_payable: { label: 'Likely paid in full', tone: 'pass' },
  likely_partial: { label: 'Likely partly paid', tone: 'warn' },
  at_risk: { label: 'At risk', tone: 'risk' },
};

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  AUTH_REQUIRED: 'Please sign in again.',
  AUTH_INVALID: 'That email and password do not match.',
  VALIDATION_FAILED: 'Please check the highlighted values.',
  EMAIL_TAKEN: 'An account with this email already exists. Try signing in.',
  RATE_LIMITED: 'Too many tries. Please wait 15 minutes and try again.',
  NOT_FOUND: 'We could not find that.',
  PLAN_NOT_FOUND: 'We do not support that plan yet.',
  FILE_TOO_LARGE: 'That file is over 4 MB. Try a smaller scan or a photo.',
  FILE_TYPE_NOT_ALLOWED: 'Only PDF, JPEG or PNG files can be read.',
  DOCUMENT_LIMIT_REACHED: 'A check can have up to 8 documents.',
  PDF_PASSWORD_PROTECTED: 'This PDF is password-protected. Save an unlocked copy and upload that.',
  LLM_UNAVAILABLE: 'Today’s free AI limit is used up — enter the facts yourself.',
  AI_QUOTA_EXCEEDED: 'Today’s free AI limit is used up — enter the facts yourself.',
  LLM_OUTPUT_INVALID: 'We could not read this document reliably. Enter the facts yourself, or try another copy.',
  INTERNAL_ERROR: 'Something went wrong on our side. Please try again.',
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

export const MISSING_LIST = (r: RuleResult) => r.missingFacts.map((k) => FACT_LABELS[k]).join(', ');

export const formatFactValue = (key: FactKey, value: FactValue): string => {
  if (value === null) return 'Not found';
  switch (FACT_KIND[key]) {
    case 'money':
      return formatInr(value as number);
    case 'date':
      return formatDate(value as string);
    case 'bool':
      return value ? 'Yes' : 'No';
    case 'room':
      return ROOM_LABELS[value as keyof typeof ROOM_LABELS] ?? String(value);
    case 'int':
      return key === 'age_at_entry' ? `${String(value)} years` : `${String(value)} days`;
    default:
      return String(value);
  }
};
