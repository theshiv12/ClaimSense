import type { Fact, FactKey } from '@claimsense/shared';

/**
 * FR-6: keys a document has a value for. The clarifier asks the user to confirm these on the facts page and never
 * asks them as a blank question: a user-stated answer would silently beat the document (Engine decision 13), even
 * when two documents disagree and the engine therefore sees the key as unknown.
 */
export const pendingDocumentKeys = (facts: Fact[]): Set<FactKey> =>
  new Set(facts.filter((f) => f.source === 'document' && f.status === 'found').map((f) => f.key));
