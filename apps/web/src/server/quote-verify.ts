import 'server-only';
import type { FactKey, FactValue, Verification } from '@claimsense/shared';
import { normalizeValue } from './normalize';

// ADR-003: the model's quote is checked against the PDF text layer in code. Pure, no I/O.
const FUZZY_MIN_RATIO = 0.85;
const FUZZY_MIN_TOKENS = 3;
const FUZZY_MAX_CHARS = 200; // longer quotes must match exactly (keeps edit distance cheap)
const NEGATIONS = new Set(['not', 'no', 'never', 'without', 'except', 'excluding', 'nor']);

/** NFKC folds ligatures (ﬁ → fi); case and whitespace never matter. */
const norm = (s: string) => s.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
const tokens = (s: string) => norm(s).replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(' ').filter(Boolean);
const isNumber = (t: string) => /^\p{N}+$/u.test(t);

const levenshtein = (a: string, b: string) => {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length]!;
};

/** True when `needle` appears in `hay` in the same order (not necessarily adjacent). */
const inOrder = (needle: string[], hay: string[]) => {
  let i = 0;
  for (const t of hay) if (t === needle[i]) i++;
  return i === needle.length;
};
const negations = (t: string[]) => t.filter((x) => NEGATIONS.has(x)).length;

/**
 * Best similarity of the quote to any run of page tokens. Numbers must appear exactly and in the same
 * order (no day/month swap), and the window must have the same negations ("not covered" ≠ "covered").
 */
const fuzzyMatch = (quote: string[], page: string[]) => {
  const joined = quote.join(' ');
  const wanted = new Set(quote);
  const numbers = quote.filter(isNumber);
  const neg = negations(quote);
  for (let n = quote.length - 1; n <= quote.length + 1; n++) {
    for (let i = 0; i + n <= page.length; i++) {
      const window = page.slice(i, i + n);
      if (window.filter((t) => wanted.has(t)).length < quote.length * 0.6) continue;
      if (!inOrder(numbers, window.filter(isNumber)) || window.filter(isNumber).length !== numbers.length) continue;
      if (negations(window) !== neg) continue;
      const w = window.join(' ');
      if (1 - levenshtein(joined, w) / Math.max(joined.length, w.length) >= FUZZY_MIN_RATIO) return true;
    }
  }
  return false;
};

/**
 * exact: the quote is on the stated page (ignoring case and spacing). fuzzy: a near match of 3+ words
 * with the same numbers in the same order. none: not there. unverifiable: no text layer (photos, scans).
 * `page` is 1-based; without it every page is searched (unit tests only).
 */
export const verifyQuote = (quote: string, pages: string[] | null, page?: number): Verification => {
  if (pages === null) return 'unverifiable';
  const q = norm(quote);
  if (q === '') return 'none';
  const candidates = page === undefined ? pages : pages[page - 1] === undefined ? [] : [pages[page - 1]!];
  if (candidates.some((p) => norm(p).includes(q))) return 'exact';
  const qt = tokens(quote);
  if (qt.length < FUZZY_MIN_TOKENS || q.length > FUZZY_MAX_CHARS) return 'none';
  return candidates.some((p) => fuzzyMatch(qt, tokens(p))) ? 'fuzzy' : 'none';
};

const MONEY_IN_TEXT = /\d[\d,]*(?:\.\d+)?(?:\s*(?:lakhs?|lacs?|crores?|cr)\b)?/gi;
const DATE_IN_TEXT = /\d{4}-\d{2}-\d{2}|(?<!\d)\d{1,2}[/.-]\d{1,2}[/.-]\d{4}(?!\d)|(?<!\d)\d{1,2}(?:st|nd|rd|th)?[\s-]+[a-z]{3,}\.?,?[\s-]+\d{4}/gi;
const MONEY = new Set<FactKey>(['sum_insured', 'sum_insured_used', 'room_rent_per_day', 'bill_total', 'bill_line_item']);
const DATES = new Set<FactKey>(['policy_start_date', 'policy_end_date', 'first_inception_date', 'admission_date', 'discharge_date', 'ped_first_diagnosed_date']);

/**
 * The value must be readable from its own quote: a true quote paired with another value (a misread,
 * or an injected number) is not verified. Yes/no facts are not checked: their quote is a label.
 */
export const valueInQuote = (key: FactKey, value: FactValue, quote: string): boolean => {
  if (value === null) return false;
  if (typeof value === 'boolean') return true;
  const any = (re: RegExp) => [...quote.matchAll(re)].some((m) => normalizeValue(key, m[0]) === value);
  if (MONEY.has(key)) return any(MONEY_IN_TEXT);
  if (DATES.has(key)) return any(DATE_IN_TEXT);
  if (typeof value === 'number') return [...quote.matchAll(/\d+/g)].some((m) => Number(m[0]) === value);
  if (key === 'room_category') return normalizeValue(key, quote) === value;
  return norm(quote).includes(norm(value));
};
