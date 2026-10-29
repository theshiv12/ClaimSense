import { describe, it } from 'vitest';
import { ClaimFactsSchema } from './claim-facts.schema';
import { accepts, rejects } from './test-helpers';

const allUnknown = {
  planId: 'star-fho',
  policyStartDate: null,
  policyEndDate: null,
  firstInceptionDate: null,
  sumInsuredPaise: null,
  sumInsuredUsedPaise: null,
  ageAtEntry: null,
  admissionDate: null,
  dischargeDate: null,
  diagnosis: null,
  icd10: null,
  isAccident: null,
  ped: { exists: null, condition: null, firstDiagnosedDate: null, disclosed: null },
  room: { category: null, rentPerDayPaise: null, days: null },
  bill: { totalPaise: null, lineItems: [] },
};

// Case B, docs/rules-spec.md. Policy year and discharge date are assumed (annual renewal on
// 12 Mar; 5 room days), since the spec does not state them. Amounts in paise (₹ × 100).
const caseB = {
  ...allUnknown,
  policyStartDate: '2026-03-12',
  policyEndDate: '2027-03-11',
  firstInceptionDate: '2019-03-12',
  sumInsuredPaise: 30_000_000, // ₹3,00,000
  sumInsuredUsedPaise: 0,
  ageAtEntry: 52,
  admissionDate: '2026-11-18',
  dischargeDate: '2026-11-23',
  diagnosis: 'Osteoarthritis, right knee',
  isAccident: false,
  ped: { exists: false, condition: null, firstDiagnosedDate: null, disclosed: null },
  room: { category: 'single', rentPerDayPaise: 700_000, days: 5 }, // ₹7,000/day
  bill: {
    // 35,000 + 7,500 + 30,000 + 13,600 + 1,05,000 + 18,000 + 21,300 + 9,600 = ₹2,40,000
    totalPaise: 24_000_000,
    lineItems: [
      { head: 'room', amountPaise: 3_500_000 },
      { head: 'nursing', amountPaise: 750_000 },
      { head: 'surgeon', amountPaise: 3_000_000 },
      { head: 'ot', amountPaise: 1_360_000 },
      { head: 'implants', amountPaise: 10_500_000 },
      { head: 'pharmacy', amountPaise: 1_800_000 },
      { head: 'diagnostics', amountPaise: 2_130_000 },
      { head: 'consumables', amountPaise: 960_000 },
    ],
  },
};

describe('ClaimFacts', () => {
  it('TC-SH-04 accepts unknown (null) facts and Case B, rejects malformed values', () => {
    accepts(ClaimFactsSchema, allUnknown);
    accepts(ClaimFactsSchema, caseB);

    rejects(ClaimFactsSchema, { ...caseB, room: { ...caseB.room, rentPerDayPaise: 7000.5 } });
    rejects(ClaimFactsSchema, { ...caseB, admissionDate: '18-11-2026' });
    rejects(ClaimFactsSchema, {
      ...caseB,
      bill: { ...caseB.bill, lineItems: [{ head: 'food', amountPaise: 100 }] },
    });
    rejects(ClaimFactsSchema, { ...caseB, ped: undefined });
  });
});
