import { selectedFacts } from '@claimsense/rules';
import type { EvidenceLine, Fact, RuleResult } from '@claimsense/shared';

/**
 * The document lines behind one check: only facts the engine actually used (same merge as toClaimFacts),
 * only from documents, and for bill lines only the room or ICU line.
 */
export const evidenceFor = (r: RuleResult, facts: Fact[]): EvidenceLine[] =>
  selectedFacts(facts)
    .filter((f) => r.usedFacts.includes(f.key) && f.source === 'document' && f.sourceQuote)
    .filter((f) => f.key !== 'bill_line_item' || f.head === 'room' || f.head === 'icu')
    .map((f) => ({ key: f.key, quote: f.sourceQuote ?? '', page: f.page }));
