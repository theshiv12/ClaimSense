import 'server-only';
import type { Verification } from '@claimsense/shared';

// ADR-003: the model's quote is checked against the PDF text layer in code. Pure, no I/O.
const FUZZY_MIN_RATIO = 0.85;
const FUZZY_MIN_TOKENS = 3;

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

/** Best similarity of the quote to any run of page tokens; numbers in the quote must appear exactly. */
const fuzzyMatch = (quote: string[], page: string[]) => {
  const joined = quote.join(' ');
  const wanted = new Set(quote);
  const numbers = quote.filter(isNumber);
  for (let n = quote.length - 1; n <= quote.length + 1; n++) {
    for (let i = 0; i + n <= page.length; i++) {
      const window = page.slice(i, i + n);
      if (window.filter((t) => wanted.has(t)).length < quote.length * 0.6) continue;
      if (!numbers.every((t) => window.includes(t))) continue;
      const w = window.join(' ');
      if (1 - levenshtein(joined, w) / Math.max(joined.length, w.length) >= FUZZY_MIN_RATIO) return true;
    }
  }
  return false;
};

/**
 * exact: the quote is in the text (ignoring case and spacing). fuzzy: a near match of 3+ words with
 * every number identical. none: not found. unverifiable: no text layer (photos, scans).
 */
export const verifyQuote = (quote: string, pages: string[] | null): Verification => {
  if (pages === null) return 'unverifiable';
  const q = norm(quote);
  if (q === '') return 'none';
  const normPages = pages.map(norm);
  if (normPages.some((p) => p.includes(q))) return 'exact';
  const qt = tokens(quote);
  if (qt.length < FUZZY_MIN_TOKENS) return 'none';
  return pages.some((p) => fuzzyMatch(qt, tokens(p))) ? 'fuzzy' : 'none';
};
