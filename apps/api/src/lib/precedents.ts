import { PrecedentCatalogSchema, type Precedent, type RuleResult } from '@claimsense/shared';
import catalogJson from '../../../../config/precedents.json';

// Reviewed public decisions only (ADR-010): the strict schema refuses drafts, so nothing unverified can load.
export const precedents: Precedent[] = PrecedentCatalogSchema.parse(catalogJson).cases;

const MAX_MATCHES = 3;
const sameInsurer = (a: string | null, b: string) => {
  if (!a) return false;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
  return norm(b).startsWith(norm(a)) || norm(a).startsWith(norm(b));
};

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
            b.decisionDate.localeCompare(a.decisionDate) ||
            a.id.localeCompare(b.id),
        )
        .slice(0, MAX_MATCHES);
