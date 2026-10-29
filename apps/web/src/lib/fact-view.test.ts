import { describe, expect, it } from 'vitest';
import { documentSummaries, type StoredFactView } from './fact-view';

const fact = (patch: Partial<StoredFactView>): StoredFactView => ({
  id: 'f', key: 'sum_insured', head: 'none', value: 1, status: 'found', source: 'document', documentId: 'd1',
  sourceQuote: 'q', page: 1, confidence: 'high', verification: 'exact', confirmedByUser: false, usable: true, ...patch,
});

describe('documentSummaries', () => {
  it('TC-UI-12 groups facts by document in upload order, without file names', () => {
    const facts = [
      fact({ id: 'a' }),
      fact({ id: 'b', usable: false, verification: 'none' }),
      fact({ id: 'c', documentId: 'd2', status: 'illegible', value: null, sourceQuote: null, page: null, usable: false }),
      fact({ id: 'd', source: 'user-stated', documentId: null, sourceQuote: null, page: null }),
    ];
    expect(documentSummaries(facts)).toEqual([
      { id: 'd1', n: 1, found: 2, toConfirm: 1 },
      { id: 'd2', n: 2, found: 0, toConfirm: 0 },
    ]);
  });
});
