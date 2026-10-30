import { FACT_VALUE_SCHEMAS, type FactKey, type FactValue } from '@claimsense/shared';

// Turns the text the model read ("Rs. 3,00,000/-", "12/03/2019") into the typed value for its key.
// Anything it cannot read becomes null, and the fact is marked illegible: never a guess.

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const DATE_KEYS = new Set<FactKey>(['policy_start_date', 'policy_end_date', 'first_inception_date', 'admission_date', 'discharge_date', 'ped_first_diagnosed_date']);
const MONEY_KEYS = new Set<FactKey>(['sum_insured', 'sum_insured_used', 'room_rent_per_day', 'bill_total', 'bill_line_item']);
const INT_KEYS = new Set<FactKey>(['age_at_entry', 'room_days']);
const BOOL_KEYS = new Set<FactKey>(['is_accident', 'ped_exists', 'ped_disclosed']);

const iso = (y: number, m: number, d: number) => {
  const s = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return FACT_VALUE_SCHEMAS.admission_date.safeParse(s).success ? s : null;
};

const toDate = (t: string): string | null => {
  let m = /(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return iso(+m[1]!, +m[2]!, +m[3]!);
  m = /(?<!\d)(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?!\d)/.exec(t); // Indian order: day/month/year
  if (m) return iso(+m[3]!, +m[2]!, +m[1]!);
  m = /(?<!\d)(\d{1,2})(?:st|nd|rd|th)?[\s-]+([a-z]{3})[a-z]*\.?,?[\s-]+(\d{4})/i.exec(t);
  if (m) {
    const month = MONTHS.indexOf(m[2]!.toLowerCase());
    return month < 0 ? null : iso(+m[3]!, month + 1, +m[1]!);
  }
  return null;
};

const toPaise = (t: string): number | null => {
  const s = t.toLowerCase().replace(/,/g, '');
  const scaled = /(\d+(?:\.\d+)?)\s*(lakhs?|lacs?|crores?|cr)\b/.exec(s);
  if (scaled) return Math.round(parseFloat(scaled[1]!) * (scaled[2]!.startsWith('c') ? 1e7 : 1e5) * 100);
  const m = /\d+(?:\.\d{1,2})?/.exec(s);
  return m ? Math.round(parseFloat(m[0]) * 100) : null;
};

const toBool = (t: string): boolean | null => {
  const s = t.trim().toLowerCase();
  if (/^(yes|y|true)\b/.test(s)) return true;
  if (/^(no|n|false|none|nil)\b/.test(s)) return false;
  return null;
};

const toRoom = (t: string): string | null => {
  const s = t.toLowerCase();
  if (/\b(icu|iccu|intensive)/.test(s)) return 'icu';
  if (/suite/.test(s)) return 'suite';
  if (/deluxe/.test(s)) return 'deluxe';
  if (/(twin|shar|semi|double)/.test(s)) return 'shared'; // before 'private': "semi-private" is shared
  if (/\b(single|private)/.test(s)) return 'single';
  if (/(general|ward|common)/.test(s)) return 'general';
  return null;
};

export const normalizeValue = (key: FactKey, text: string): FactValue => {
  const t = text.trim();
  if (t === '') return null;
  let value: FactValue;
  if (DATE_KEYS.has(key)) value = toDate(t);
  else if (MONEY_KEYS.has(key)) value = toPaise(t);
  else if (INT_KEYS.has(key)) value = /\d+/.exec(t) ? parseInt(/\d+/.exec(t)![0], 10) : null;
  else if (BOOL_KEYS.has(key)) value = toBool(t);
  else if (key === 'room_category') value = toRoom(t);
  else value = t.replace(/\s+/g, ' ').slice(0, 500);
  return value !== null && FACT_VALUE_SCHEMAS[key].safeParse(value).success ? value : null;
};
