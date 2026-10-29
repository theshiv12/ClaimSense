import type { Fact } from '@claimsense/shared';
import { describe, expect, it } from 'vitest';
import { selectedFacts } from './to-claim-facts';

const doc = (patch: Partial<Fact>): Fact => ({
  key: 'admission_date', head: 'none', value: '2026-11-18', status: 'found', source: 'document',
  documentId: 'doc-1', sourceQuote: 'q', page: 1, confidence: 'high', verification: 'exact', confirmedByUser: false, ...patch,
});
const user = (patch: Partial<Fact>): Fact => ({ ...doc({}), source: 'user-stated', documentId: null, sourceQuote: null, page: null, verification: 'none', ...patch });

describe('selectedFacts', () => {
  it('TC-TCF-10 returns exactly the facts the engine used', () => {
    const rentDoc = doc({ key: 'room_rent_per_day', value: 700_000, sourceQuote: 'Room 7,000' });
    const rentUser = user({ key: 'room_rent_per_day', value: 500_000 });
    const admA = doc({});
    const admB = doc({ documentId: 'doc-2', value: '2026-11-19' });
    const siA = doc({ key: 'sum_insured', value: 30_000_000 });
    const siB = doc({ key: 'sum_insured', value: 30_000_000, documentId: 'doc-2' });
    const lowAge = doc({ key: 'age_at_entry', value: 52, confidence: 'low' });
    const room = doc({ key: 'bill_line_item', head: 'room', value: 3_500_000 });
    const picked = selectedFacts([rentDoc, rentUser, admA, admB, siA, siB, lowAge, room]);
    expect(picked).toEqual([rentUser, siA, siB, room]);
  });

  it('TC-TCF-10 a head found in two documents selects no line items', () => {
    const a = doc({ key: 'bill_line_item', head: 'implants', value: 100 });
    const b = doc({ key: 'bill_line_item', head: 'implants', value: 100, documentId: 'doc-2' });
    expect(selectedFacts([a, b])).toEqual([]);
  });
});
