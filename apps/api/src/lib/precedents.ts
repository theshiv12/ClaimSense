import { PrecedentCatalogSchema, type Precedent, type RuleResult } from '@claimsense/shared';
import catalogJson from '../../../../config/precedents.json';

// Reviewed public decisions only (ADR-010): the strict schema refuses drafts, so nothing unverified can load.
export const precedents: Precedent[] = PrecedentCatalogSchema.parse(catalogJson).cases;

const MAX_MATCHES = 3;
// Legal suffixes differ between documents ("Co. Ltd." vs "Company Limited"); the name itself must match exactly.
const SUFFIX_WORDS = new Set(['the', 'company', 'co', 'limited', 'ltd']);
const insurerName = (s: string) =>
  s.toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter((w) => w && !SUFFIX_WORDS.has(w)).join(' ');

/** The same insurer: equal names after dropping legal suffixes. A short or empty name never matches. */
export const sameInsurer = (caseInsurer: string | null, planInsurer: string) => {
  const a = insurerName(caseInsurer ?? '');
  return a.length > 0 && a === insurerName(planInsurer);
};

const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0); // not locale-dependent

/**
 * Cases on the same rule and outcome as this check: the claim's insurer first, then the newest, ties by id
 * (deterministic). A passing check has none.
 */
export const matchPrecedents = (cases: Precedent[], insurer: string, result: RuleResult): Precedent[] =>
  result.outcome === 'pass'
    ? []
    : cases
        .filter((c) => c.ruleId === result.ruleId && c.outcome === result.outcome)
        .sort(
          (a, b) =>
            Number(sameInsurer(b.insurer, insurer)) - Number(sameInsurer(a.insurer, insurer)) ||
            byText(b.decisionDate, a.decisionDate) ||
            byText(a.id, b.id),
        )
        .slice(0, MAX_MATCHES);
