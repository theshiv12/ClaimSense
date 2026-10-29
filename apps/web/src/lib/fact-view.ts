import { isUsable } from '@claimsense/rules';
import type { StoredFactView, WireFact } from '@claimsense/shared';

// The API's fact shapes (packages/shared api-views), re-exported for the components.
export type { StoredFactView, WireFact };

export const toView = (f: WireFact): StoredFactView => ({ ...f, usable: isUsable(f) });

export interface DocumentSummary {
  id: string;
  n: number;
  found: number;
  toConfirm: number;
}

/** One entry per uploaded document, numbered in upload order. File names are never kept (golden rules 6 and 9). */
export const documentSummaries = (facts: StoredFactView[]): DocumentSummary[] => {
  const docs = new Map<string, DocumentSummary>();
  for (const f of facts) {
    if (f.source !== 'document' || !f.documentId) continue;
    const d = docs.get(f.documentId) ?? { id: f.documentId, n: docs.size + 1, found: 0, toConfirm: 0 };
    if (f.status === 'found') d.found += 1;
    if (f.status === 'found' && !f.usable) d.toConfirm += 1;
    docs.set(f.documentId, d);
  }
  return [...docs.values()];
};
