import { describe, expect, it } from 'vitest';
import type { Fact } from '@claimsense/shared';
import { toClaimFacts } from './to-claim-facts';

// docs/rules-spec.md "Usable facts": found + exact/fuzzy + not low; or confirmed; or user-stated/-corrected.
const doc = (patch: Partial<Fact>): Fact => ({
  key: 'admission_date', head: 'none', value: '2026-11-18', status: 'found', source: 'document',
  documentId: 'doc-1', sourceQuote: 'Admission 18/11/2026', page: 1, confidence: 'high',
  verification: 'exact', confirmedByUser: false, ...patch,
});
const user = (patch: Partial<Fact>): Fact => ({
  ...doc({}), source: 'user-stated', documentId: null, sourceQuote: null, page: null, verification: 'none', ...patch,
});

describe('toClaimFacts', () => {
  it('TC-TCF-01 uses a verified, confident document fact', () => {
    expect(toClaimFacts([doc({})], 'star-fho').admissionDate).toBe('2026-11-18');
    expect(toClaimFacts([doc({ verification: 'fuzzy', confidence: 'medium' })], 'star-fho').admissionDate).toBe('2026-11-18');
  });

  it('TC-TCF-02 treats an unverified or low-confidence fact as unknown', () => {
    expect(toClaimFacts([doc({ verification: 'none' })], 'star-fho').admissionDate).toBeNull();
    expect(toClaimFacts([doc({ verification: 'unverifiable' })], 'star-fho').admissionDate).toBeNull();
    expect(toClaimFacts([doc({ verification: 'fuzzy', confidence: 'low' })], 'star-fho').admissionDate).toBeNull();
    expect(toClaimFacts([doc({ status: 'not_found', value: null })], 'star-fho').admissionDate).toBeNull();
  });

  it('TC-TCF-03 uses a confirmed or user-stated fact', () => {
    expect(toClaimFacts([doc({ verification: 'none', confirmedByUser: true })], 'star-fho').admissionDate).toBe('2026-11-18');
    expect(toClaimFacts([user({ key: 'is_accident', value: true })], 'star-fho').isAccident).toBe(true);
  });

  it('TC-TCF-04 prefers the user correction over the document', () => {
    const f = toClaimFacts([doc({}), user({ source: 'user-corrected', value: '2026-11-20' })], 'star-fho');
    expect(f.admissionDate).toBe('2026-11-20');
    const g = toClaimFacts([user({ source: 'user-corrected', value: '2026-11-20' }), doc({})], 'star-fho');
    expect(g.admissionDate).toBe('2026-11-20');
  });

  it('TC-TCF-05 collects usable line items and the bill total', () => {
    const f = toClaimFacts(
      [
        doc({ key: 'bill_line_item', head: 'room', value: 3_500_000 }),
        doc({ key: 'bill_line_item', head: 'implants', value: 10_500_000 }),
        user({ key: 'bill_line_item', head: 'pharmacy', value: 1_800_000 }),
        doc({ key: 'bill_line_item', head: 'nursing', value: 750_000, verification: 'none' }),
        doc({ key: 'bill_total', value: 15_800_000 }),
        doc({ key: 'room_category', value: 'single' }),
        doc({ key: 'ped_exists', value: false }),
        doc({ key: 'sum_insured', value: 30_000_000 }),
        doc({ key: 'room_days', value: 5 }),
      ],
      'star-fho',
    );
    expect(f.bill.lineItems).toEqual([
      { head: 'room', amountPaise: 3_500_000 },
      { head: 'implants', amountPaise: 10_500_000 },
      { head: 'pharmacy', amountPaise: 1_800_000 },
    ]);
    expect(f.bill.totalPaise).toBe(15_800_000);
    expect(f).toMatchObject({ sumInsuredPaise: 30_000_000, room: { category: 'single', days: 5 }, ped: { exists: false } });
  });

  it('TC-TCF-06 gives all-null facts when nothing is known', () => {
    const f = toClaimFacts([], 'star-fho');
    expect(f.planId).toBe('star-fho');
    expect(f.admissionDate).toBeNull();
    expect(f.ped).toEqual({ exists: null, condition: null, firstDiagnosedDate: null, disclosed: null });
    expect(f.bill).toEqual({ totalPaise: null, lineItems: [] });
  });
});
