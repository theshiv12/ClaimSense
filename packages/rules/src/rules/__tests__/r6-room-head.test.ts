import type { PlanConfig } from '@claimsense/shared';
import { describe, expect, it } from 'vitest';
import { facts, testPlan } from '../../../test/factories';
import { r6RoomRent } from '../r6-room-rent';

// docs/test-cases.md TC-R6-24: a deduction says which head it judged, so the UI never offers a ward room
// for an ICU stay. Plan T with an ICU cap of ₹8,000/day (ward cap stays ₹5,000/day).
const base = testPlan();
const clause = { clauseId: 'T-6', page: 1, quote: 'Room rent up to Rs. 5,000 per day; ICU up to Rs. 8,000 per day.', source: 'wording' as const };
const plan: PlanConfig = { ...base, roomRent: { kind: 'fixed_per_day', capPaise: 500_000, icuCapPaise: 800_000, clause } };

describe('R6 room head', () => {
  it('TC-R6-24 reports the room head it judged (room or icu)', () => {
    // Ward: single at ₹7,000/day × 1 over the ₹5,000 cap → room cut 2,00,000 paise.
    const ward = facts({ room: { category: 'single', rentPerDayPaise: 700_000, days: 1 }, bill: { totalPaise: 700_000, lineItems: [{ head: 'room', amountPaise: 700_000 }] } });
    const w = r6RoomRent(ward, plan, 700_000);
    expect([w.outcome, w.params.roomHead, w.params.capPerDayPaise]).toEqual(['deduction', 'room', 500_000]);
    // ICU at ₹10,000/day × 1 over the ₹8,000 ICU cap → ICU cut 2,00,000 paise.
    const icu = facts({ room: { category: 'icu', rentPerDayPaise: 1_000_000, days: 1 }, bill: { totalPaise: 1_000_000, lineItems: [{ head: 'icu', amountPaise: 1_000_000 }] } });
    const i = r6RoomRent(icu, plan, 1_000_000);
    expect([i.outcome, i.params.roomHead, i.params.capPerDayPaise, i.deductionPaise]).toEqual(['deduction', 'icu', 800_000, 200_000]);
  });
});
