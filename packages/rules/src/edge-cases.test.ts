import { describe, expect, it } from 'vitest';
import type { ClaimFacts, PlanConfig } from '@claimsense/shared';
import { caseFacts, facts, testPlan } from '../test/factories';
import { estimate } from './engine';
import { r2InitialWait } from './rules/r2-initial-wait';
import { r3SpecificDiseaseWait } from './rules/r3-specific-disease-wait';
import { r4PedWait } from './rules/r4-ped-wait';
import { r6RoomRent } from './rules/r6-room-rent';
import { r7CoPay } from './rules/r7-co-pay';
import { simulateRoom } from './simulate-room';

// Edge cases added after the first green run to reach the coverage gate (docs/test-cases.md).
const plan = testPlan();
const clause = plan.roomRent.clause!;
type Item = ClaimFacts['bill']['lineItems'][number];
const room = (r: Partial<ClaimFacts['room']>, lineItems: Item[], patch: Partial<ClaimFacts> = {}) => {
  const total = lineItems.reduce((s, i) => s + i.amountPaise, 0);
  return { f: facts({ room: { category: 'single', rentPerDayPaise: 700_000, days: 1, ...r }, bill: { totalPaise: total, lineItems }, ...patch }), total };
};
const tiered = (icuCapPaise: number | null): PlanConfig => ({
  ...plan,
  roomRent: {
    kind: 'by_sum_insured',
    tiers: [
      { minSumInsuredPaise: 30_000_000, cap: { type: 'per_day', capPaise: 500_000 } },
      { minSumInsuredPaise: 50_000_000, cap: { type: 'category', maxCategory: 'single' } },
    ],
    icuCapPaise,
    clause,
  },
});
const cataract = { diagnosis: 'Senile cataract', icd10: 'H25.9', admissionDate: '2026-03-10' }; // month 14 from I

describe('Eligibility edge cases', () => {
  it('TC-R2-09 is unknown when the admission date is missing', () => {
    expect(r2InitialWait(facts({ admissionDate: null }), plan).missingFacts).toEqual(['admission_date']);
  });

  it('TC-R2-10 fails an admission before the first inception date', () => {
    // Engine decision 7. I = 2025-01-10; admission 2025-01-09.
    expect(r2InitialWait(facts({ admissionDate: '2025-01-09' }), plan).reasonCode).toBe('R2_BEFORE_INCEPTION');
  });

  it('TC-R3-14 is unknown for a listed condition when inception is missing', () => {
    expect(r3SpecificDiseaseWait(facts({ ...cataract, firstInceptionDate: null }), plan).missingFacts).toEqual(['first_inception_date']);
  });

  it('TC-R3-15 fails a listed accident when the plan does not exempt accidents', () => {
    const strict = { ...plan, specificDiseaseWait: { ...plan.specificDiseaseWait, accidentExempt: false } };
    expect(r3SpecificDiseaseWait(facts({ ...cataract, isAccident: true }), strict).outcome).toBe('fail');
  });

  it('TC-R3-16 is unknown inside the wait when accident is unknown', () => {
    expect(r3SpecificDiseaseWait(facts({ ...cataract, isAccident: null }), plan).missingFacts).toEqual(['is_accident']);
  });

  it('TC-R4-09 is unknown for a PED when inception is missing', () => {
    const ped = { exists: true, condition: 'Diabetes', firstDiagnosedDate: '2024-06-01', disclosed: true };
    expect(r4PedWait(facts({ ped, firstInceptionDate: null }), plan).missingFacts).toEqual(['first_inception_date']);
  });
});

describe('R6 edge cases', () => {
  it('TC-R6-17 caps an ICU stay at the ICU cap', () => {
    // ICU head 2000000 − 1000000 × 1 = 1000000.
    const p = { ...plan, roomRent: { kind: 'fixed_per_day' as const, capPaise: 500_000, icuCapPaise: 1_000_000, clause } };
    const { f, total } = room({ category: 'icu', rentPerDayPaise: 2_000_000 }, [{ head: 'icu', amountPaise: 2_000_000 }]);
    expect(r6RoomRent(f, p, total).deductionPaise).toBe(1_000_000);
  });

  it('TC-R6-18 does not cap ICU on a % plan with no ICU %', () => {
    const p = { ...plan, roomRent: { kind: 'pct_of_si_per_day' as const, bps: 100, icuBps: null, clause } };
    const { f, total } = room({ category: 'icu', rentPerDayPaise: 2_000_000 }, [{ head: 'icu', amountPaise: 2_000_000 }]);
    expect(r6RoomRent(f, p, total).outcome).toBe('pass');
  });

  it('TC-R6-19 caps ICU on a tier plan with an ICU cap', () => {
    // 1500000 − 1000000 = 500000.
    const { f, total } = room({ category: 'icu', rentPerDayPaise: 1_500_000 }, [{ head: 'icu', amountPaise: 1_500_000 }]);
    expect(r6RoomRent(f, tiered(1_000_000), total).deductionPaise).toBe(500_000);
  });

  it('TC-R6-20 is unknown on a category tier when the room category is missing', () => {
    const { f, total } = room({ category: null }, [{ head: 'room', amountPaise: 700_000 }], { sumInsuredPaise: 50_000_000 });
    expect(r6RoomRent(f, tiered(null), total).missingFacts).toEqual(['room_category']);
  });

  it('TC-R6-21 passes when the rent is over the cap but nothing on the bill is cut', () => {
    const { f, total } = room({}, [{ head: 'implants', amountPaise: 1_000_000 }]);
    const r = r6RoomRent(f, plan, total);
    expect(r.outcome).toBe('pass');
    expect(r.deductionPaise).toBe(0);
  });

  it('TC-R6-22 is unknown for an empty bill', () => {
    const { f } = room({}, [], { bill: { totalPaise: null, lineItems: [] } });
    expect(r6RoomRent(f, plan, 0).missingFacts).toEqual(['bill_line_item']);
  });
});

describe('Amount and engine edge cases', () => {
  it('TC-R7-06 uses the highest co-pay tier that applies', () => {
    // 1000000 × 3000 ÷ 10000 = 300000.
    const p = { ...plan, coPay: { ...plan.coPay, tiers: [{ minAgeAtEntry: 76, bps: 3000 }, { minAgeAtEntry: 61, bps: 2000 }] } };
    expect(r7CoPay(facts({ ageAtEntry: 80 }), p, 1_000_000).deductionPaise).toBe(300_000);
  });

  it('TC-ENG-06 counts a stated total above the line items as an other line', () => {
    // Case D items 8000000; total 8100000 → other 100000; rent within cap, so payable 8100000.
    const d = caseFacts('D');
    const e = estimate({ ...d, bill: { ...d.bill, totalPaise: 8_100_000 } }, plan, 1);
    expect(e.claimedPaise).toBe(8_100_000);
    expect(e.payablePaise).toBe(8_100_000);
  });

  it('TC-SIM-04 replaces an ICU line, keeps a bill with no room line, and keeps a null total', () => {
    // ICU 2 days at 2000000 → shared 300000 × 2 = 600000; surgeon 1000000 kept.
    const icu = facts({
      room: { category: 'icu', rentPerDayPaise: 2_000_000, days: 2 },
      bill: { totalPaise: null, lineItems: [{ head: 'icu', amountPaise: 4_000_000 }, { head: 'surgeon', amountPaise: 1_000_000 }] },
    });
    expect(simulateRoom(icu, plan, { category: 'shared', rentPerDayPaise: 300_000 }, 1).claimedPaise).toBe(1_600_000);

    // No room line: room 300000 × 2 added to surgeon 1000000 = 1600000; total 1000000 − 0 + 600000.
    const noRoom = facts({ room: { category: 'shared', rentPerDayPaise: 300_000, days: 2 }, bill: { totalPaise: 1_000_000, lineItems: [{ head: 'surgeon', amountPaise: 1_000_000 }] } });
    expect(simulateRoom(noRoom, plan, { category: 'icu', rentPerDayPaise: 300_000 }, 1).claimedPaise).toBe(1_600_000);
  });
});
