import type { Fact } from '@claimsense/shared';
import { describe, expect, it } from 'vitest';
import { pendingDocumentKeys } from './pending';

const doc = (patch: Partial<Fact>): Fact => ({
  key: 'admission_date', head: 'none', value: '2026-11-18', status: 'found', source: 'document', documentId: 'd1',
  sourceQuote: 'q', page: 1, confidence: 'high', verification: 'exact', confirmedByUser: false, ...patch,
});

describe('pendingDocumentKeys', () => {
  it('TC-CLAR-05 any found document value makes the clarifier confirm, never ask', () => {
    // Two usable documents that disagree: toClaimFacts gives null, yet the user must see them, not a blank question.
    const keys = pendingDocumentKeys([doc({}), doc({ documentId: 'd2', value: '2026-11-19' }), doc({ key: 'sum_insured', status: 'not_found', value: null })]);
    expect([...keys]).toEqual(['admission_date']);
  });
});
