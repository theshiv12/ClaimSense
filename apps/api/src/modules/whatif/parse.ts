import type { WhatIfPatch } from '@claimsense/rules';
import { formatDate, formatInr, type RoomCategory } from '@claimsense/shared';
import { normalizeValue } from '../../lib/normalize';

// FR-17: a free-text "what if…" is recognised here, in code, never by the model. Each match becomes one change
// to the facts, and the engine computes the result (modules/chat). Anything not recognised returns null and
// goes to the grounded answer instead.

export interface WhatIfRequest {
  /** Plain words for the change, shown back to the user ("twin sharing at ₹4,500/day"). */
  label: string;
  patch: WhatIfPatch;
  /** "after the waiting period": the date comes from the engine's own waitEnds for this claim. */
  afterWait?: true;
}

const TRIGGER = /\b(what if|what happens if|suppose|agar|if (?:i|we|it|my|the|she|he|they))\b/i;

const ROOMS: [RegExp, RoomCategory, string][] = [
  [/\b(twin sharing|twin|shared room|sharing)\b/i, 'shared', 'twin sharing'],
  [/\b(general ward|general)\b/i, 'general', 'general ward'],
  [/\bsingle\b/i, 'single', 'single room'],
  [/\bdeluxe\b/i, 'deluxe', 'deluxe room'],
  [/\bsuite\b/i, 'suite', 'suite'],
];

const money = (text: string): number | null => {
  const v = normalizeValue('sum_insured', text);
  return typeof v === 'number' && v > 0 ? v : null;
};

export const parseWhatIf = (question: string): WhatIfRequest | null => {
  if (!TRIGGER.test(question)) return null;
  const q = question.toLowerCase();

  if (/\bafter (the )?(waiting period|wait)\b/.test(q)) return { label: 'admission after the waiting period', afterWait: true, patch: {} };

  const date = /\badmi\w*\s+(?:on\s+)?(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+[a-z]{3,9}\s+\d{4}|\d{4}-\d{2}-\d{2})/i.exec(question);
  if (date) {
    const iso = normalizeValue('admission_date', date[1]!);
    if (typeof iso === 'string') return { label: `admission on ${formatDate(iso)}`, patch: { admissionDate: iso } };
  }

  for (const [pattern, category, name] of ROOMS) {
    const m = pattern.exec(question);
    if (!m) continue;
    // The rent is the first amount after the room words ("at 4500", "₹2,000 per day").
    const rent = /(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d+)?)/i.exec(question.slice(m.index + m[0].length));
    const paise = rent ? money(rent[1]!) : null;
    return paise ? { label: `${name} at ${formatInr(paise)}/day`, patch: { room: { category, rentPerDayPaise: paise } } } : null;
  }

  const si = /sum insured\D{0,20}?(\d[\d,.]*\s*(?:lakhs?|lacs?|crores?|cr)?)/i.exec(question);
  if (si) {
    const paise = money(si[1]!);
    if (paise) return { label: `sum insured ${formatInr(paise)}`, patch: { sumInsuredPaise: paise } };
  }

  if (/\b(declared|disclosed)\b/.test(q)) return { label: 'the condition was declared', patch: { pedDisclosed: true } };
  if (/\baccident\b/.test(q)) return { label: 'it was an accident', patch: { isAccident: true } };
  return null;
};
