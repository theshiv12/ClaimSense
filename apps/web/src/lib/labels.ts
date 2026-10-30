import type { BillHead, ErrorCode, FactKey, FactValue, RoomCategory, RuleResult, Verdict } from '@claimsense/shared';
import { explain, FACT_LABELS, RULE_TITLES } from '@claimsense/shared';
import { formatDate, formatInr } from './format';

// explain, FACT_LABELS and RULE_TITLES live in @claimsense/shared (the API's chat uses the same sentences).
export { explain, FACT_LABELS, RULE_TITLES };

export type FactKind = 'money' | 'date' | 'bool' | 'int' | 'room' | 'text';

export const FACT_KIND: Record<FactKey, FactKind> = {
  plan_uin: 'text', policy_start_date: 'date', policy_end_date: 'date', first_inception_date: 'date',
  sum_insured: 'money', sum_insured_used: 'money', age_at_entry: 'int', admission_date: 'date',
  discharge_date: 'date', diagnosis: 'text', diagnosis_icd10: 'text', is_accident: 'bool', ped_exists: 'bool',
  ped_condition: 'text', ped_first_diagnosed_date: 'date', ped_disclosed: 'bool', room_category: 'room',
  room_rent_per_day: 'money', room_days: 'int', bill_total: 'money', bill_line_item: 'money',
};


export const HEAD_LABELS: Record<BillHead, string> = {
  none: '—', room: 'Room', icu: 'ICU', nursing: 'Nursing', surgeon: 'Surgeon fees', consultation: 'Consultation',
  ot: 'OT charges', pharmacy: 'Pharmacy', consumables: 'Consumables', implants: 'Implants', diagnostics: 'Diagnostics', other: 'Other',
};

export const ROOM_LABELS: Record<RoomCategory, string> = {
  general: 'General ward', shared: 'Twin sharing', single: 'Single room', deluxe: 'Deluxe room', suite: 'Suite', icu: 'ICU',
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
