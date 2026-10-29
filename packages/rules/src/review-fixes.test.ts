import { describe, expect, it } from 'vitest';
import type { Fact } from '@claimsense/shared';
import { caseFacts, facts, testPlan } from '../test/factories';
import { estimate } from './engine';
import { r6RoomRent } from './rules/r6-room-rent';
import { toClaimFacts } from './to-claim-facts';

// Fixes from the Phase B code review (docs/test-cases.md TC-TCF-07..09, TC-ENG-07, TC-R6-23).
const doc = (patch: Partial<Fact>): Fact => ({
  key: 'admission_date', head: 'none', value: '2026-11-18', status: 'found', source: 'document',
  documentId: 'doc-1', sourceQuote: 'Admission 18/11/2026', page: 1, confidence: 'high',
  verification: 'exact', confirmedByUser: false, ...patch,
});
const user = (patch: Partial<Fact>): Fact => ({
  ...doc({}), source: 'user-corrected', documentId: null, sourceQuote: null, page: null, verification: 'none', ...patch,
});

describe('Review fixes', () => {
  it('TC-TCF-07 a user correction replaces the document line item for that head', () => {
    const f = toClaimFacts(
      [doc({ key: 'bill_line_item', head: 'room', value: 3_500_000 }), user({ key: 'bill_line_item', head: 'room', value: 2_500_000 }),
        doc({ key: 'bill_line_item', head: 'implants', value: 100 })],
      'p',
    );
    expect(f.bill.lineItems).toEqual([{ head: 'room', amountPaise: 2_500_000 }, { head: 'implants', amountPaise: 100 }]);
  });

  it('TC-TCF-08 conflicting document values are unknown until the user resolves them', () => {
    const two = [doc({}), doc({ documentId: 'doc-2', value: '2026-11-19' })];
    expect(toClaimFacts(two, 'p').admissionDate).toBeNull();
    expect(toClaimFacts([doc({}), doc({ documentId: 'doc-2' })], 'p').admissionDate).toBe('2026-11-18');
    expect(toClaimFacts([...two, user({ value: '2026-11-19' })], 'p').admissionDate).toBe('2026-11-19');
  });

  it('TC-TCF-09 the same head from two documents is not added twice', () => {
    const f = toClaimFacts(
      [doc({ key: 'bill_line_item', head: 'implants', value: 100 }), doc({ key: 'bill_line_item', head: 'implants', value: 100, documentId: 'doc-2' })],
      'p',
    );
    expect(f.bill.lineItems).toEqual([]);
  });

  it('TC-ENG-07 an amount not split into line items makes R6 unknown', () => {
    const d = caseFacts('D');
    const e = estimate({ ...d, bill: { ...d.bill, totalPaise: 8_100_000 } }, testPlan(), 1);
    expect(e.results.find((r) => r.ruleId === 'R6')).toMatchObject({ outcome: 'unknown', missingFacts: ['bill_line_item'] });
    expect(e.verdict).toBe('likely_partial');
  });

  it('TC-R6-23 an ICU line with no room category is unknown', () => {
    const f = facts({ room: { category: null, rentPerDayPaise: 700_000, days: 1 }, bill: { totalPaise: 700_000, lineItems: [{ head: 'icu', amountPaise: 700_000 }] } });
    expect(r6RoomRent(f, testPlan(), 700_000).missingFacts).toEqual(['room_category']);
  });
});
