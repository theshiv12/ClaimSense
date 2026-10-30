import type { Fact, RuleResult } from '@claimsense/shared';
import { describe, expect, it } from 'vitest';
import { evidenceFor } from './evidence';

const doc = (patch: Partial<Fact>): Fact => ({
  key: 'room_rent_per_day', head: 'none', value: 700_000, status: 'found', source: 'document', documentId: 'd1',
  sourceQuote: 'Room charges (Single AC) 7,000 per day', page: 1, confidence: 'high', verification: 'exact', confirmedByUser: false, ...patch,
});
const r6: RuleResult = {
  ruleId: 'R6', outcome: 'deduction', applicable: true, reasonCode: 'R6_ROOM_OVER_CAP', deductionPaise: 1,
  clause: null, usedFacts: ['room_rent_per_day', 'bill_line_item'], missingFacts: [], params: {},
};

describe('evidenceFor', () => {
  it('TC-UI-11b cites only document lines the engine used', () => {
    const facts = [
      doc({}),
      { ...doc({}), source: 'user-stated' as const, value: 650_000, documentId: null, sourceQuote: null, page: null, verification: 'none' as const },
      doc({ key: 'bill_line_item', head: 'room', value: 3_500_000, sourceQuote: 'Room (Single AC) 7,000 x 5 = 35,000', page: 2 }),
      doc({ key: 'bill_line_item', head: 'nursing', value: 750_000, sourceQuote: 'Nursing 7,500' }),
    ];
    expect(evidenceFor(r6, facts)).toEqual([{ key: 'bill_line_item', quote: 'Room (Single AC) 7,000 x 5 = 35,000', page: 2 }]);
  });
});
