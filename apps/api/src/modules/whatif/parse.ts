import type { WhatIfPatch } from '@claimsense/rules';
import { formatDate, formatInr, type RoomCategory } from '@claimsense/shared';
import { normalizeValue } from '../../lib/normalize';

// FR-17: a free-text "what if…" is recognised here, in code, never by the model. Each match becomes one change
// to the facts, and the engine computes the result (modules/chat). A wrong parse is worse than none: on
// negation, more than one change, or an amount that is not clear, this returns null and the question goes to
// the grounded answer instead.

export interface WhatIfRequest {
  /** Plain words for the change, shown back to the user ("twin sharing at ₹4,500/day"). */
  label: string;
  patch: WhatIfPatch;
  /** "after the waiting period": the date comes from the engine's own waitEnds for this claim. */
  afterWait?: true;
}

// Only explicit what-if phrasing: "why is it cut if the room is…" is a question about the estimate, not a what-if.
const TRIGGER = /\b(what if|what happens if|suppose|agar)\b/i;
const NEGATION = /\b(not|never|no|nahi|nahin|na)\b|n't\b/i;
const MIN_RENT_PAISE = 10_000; // ₹100/day: anything lower is a misread number, not a room rent

const ROOMS: [RegExp, RoomCategory, string][] = [
  [/\b(twin sharing|twin|shared room|sharing)\b/i, 'shared', 'twin sharing'],
  [/\bgeneral ward\b/i, 'general', 'general ward'],
  [/\bsingle( room)?\b/i, 'single', 'single room'],
  [/\bdeluxe\b/i, 'deluxe', 'deluxe room'],
  [/\bsuite\b/i, 'suite', 'suite'],
];

const money = (text: string): number | null => {
  const v = normalizeValue('sum_insured', text);
  return typeof v === 'number' && v > 0 ? v : null;
};

/** A room change: the room words and a price written as one ("at 4500", "@ ₹4,500", "₹4,500 per day"). */
const roomChange = (question: string): WhatIfRequest | null => {
  const room = ROOMS.find(([pattern]) => pattern.test(question));
  if (!room) return null;
  const [, category, name] = room;
  // The price must be marked as a price; a number followed by days/nights is a duration, never a rent.
  const price = /(?:\bat\b|@|₹|\brs\.?|\binr\b)\s*₹?\s*(\d[\d,]*(?:\.\d+)?)(?!\s*(?:k\b|days?|nights?))/i.exec(question);
  const paise = price ? money(price[1]!) : null;
  return paise && paise >= MIN_RENT_PAISE ? { label: `${name} at ${formatInr(paise)}/day`, patch: { room: { category, rentPerDayPaise: paise } } } : null;
};

const sumInsuredChange = (question: string): WhatIfRequest | null => {
  if (!/sum insured/i.test(question)) return null;
  // One amount, optionally in lakh/crore; compound amounts ("3 lakh 50 thousand") are not guessed.
  if (/\b(thousand|hazaar|hazar)\b/i.test(question) || (question.match(/\b(lakhs?|lacs?|crores?|cr)\b/gi) ?? []).length > 1) return null;
  const si = /sum insured\D{0,20}?(\d[\d,.]*\s*(?:lakhs?|lacs?|crores?|cr)?)\b/i.exec(question);
  const paise = si ? money(si[1]!) : null;
  return paise ? { label: `sum insured ${formatInr(paise)}`, patch: { sumInsuredPaise: paise } } : null;
};

const admissionChange = (question: string): WhatIfRequest | null => {
  if (/\bafter (the )?(waiting period|wait)\b/i.test(question)) return { label: 'admission after the waiting period', afterWait: true, patch: {} };
  const date = /\badmi\w*\s+(?:on\s+)?(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+[a-z]{3,9}\s+\d{4}|\d{4}-\d{2}-\d{2})/i.exec(question);
  const iso = date ? normalizeValue('admission_date', date[1]!) : null;
  return typeof iso === 'string' ? { label: `admission on ${formatDate(iso)}`, patch: { admissionDate: iso } } : null;
};

export const parseWhatIf = (question: string): WhatIfRequest | null => {
  if (!TRIGGER.test(question) || NEGATION.test(question)) return null;
  const q = question.toLowerCase();
  const found = [
    admissionChange(question),
    roomChange(question),
    sumInsuredChange(question),
    /\b(declared|disclosed)\b/.test(q) ? { label: 'the condition was declared', patch: { pedDisclosed: true } } : null,
    /\baccident\b/.test(q) ? { label: 'it was an accident', patch: { isAccident: true } } : null,
  ].filter((x): x is WhatIfRequest => x !== null);
  // Mentions of more than one kind of change ("10 lakh and twin sharing") are not split or half-applied.
  const kinds = [/sum insured/i, /\b(twin|sharing|general ward|single|deluxe|suite)\b/i, /\badmi\w*/i, /\b(declared|disclosed)\b/i, /\baccident\b/i].filter((k) =>
    k.test(question),
  ).length;
  return found.length === 1 && kinds === 1 ? found[0]! : null;
};
