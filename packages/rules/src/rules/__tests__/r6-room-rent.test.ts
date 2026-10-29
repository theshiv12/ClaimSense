import { describe, expect, it } from 'vitest';
import type { ClaimFacts } from '@claimsense/shared';
import { facts, testPlan } from '../../../test/factories';
import { r6RoomRent } from '../r6-room-rent';

// docs/rules-spec.md R6: rent per day ≤ cap → no deduction. Otherwise the room head is paid at
// cap × days and every head not in excludedHeads is paid × (cap ÷ rent), floor per head (Rounding).
const plan = testPlan(); // cap 500000/day, excluded implants/pharmacy/diagnostics, clause T-6
type Item = ClaimFacts['bill']['lineItems'][number];
const run = (rentPerDayPaise: number | null, days: number | null, lineItems: Item[], pl = plan) => {
  const total = lineItems.reduce((s, i) => s + i.amountPaise, 0);
  const f = facts({ room: { category: 'single', rentPerDayPaise, days }, bill: { totalPaise: total, lineItems } });
  return r6RoomRent(f, pl, total);
};
const item = (head: Item['head'], amountPaise: number): Item => ({ head, amountPaise });

describe('R6 room rent and proportionate deduction', () => {
  it('TC-R6-01 passes with no deduction when rent is exactly at the cap', () => {
    const r = run(500_000, 1, [item('room', 500_000)]);
    expect(r.outcome).toBe('pass');
    expect(r.deductionPaise).toBe(0);
  });

  it('TC-R6-02 deducts 2 paise when rent is 1 paise over the cap', () => {
    // Room: 500001 − 500000 × 1 = 1.
    // Nursing: 100000 − floor(100000 × 500000 ÷ 500001) = 100000 − floor(99999.80) = 1. Total 2.
    const r = run(500_001, 1, [item('room', 500_001), item('nursing', 100_000)]);
    expect(r.outcome).toBe('deduction');
    expect(r.deductionPaise).toBe(2);
    expect(r.clause?.clauseId).toBe(plan.roomRent.clause?.clauseId);
  });

  it('TC-R6-03 floors each proportionate head in the insurer’s favour', () => {
    // Room: 700000 − 500000 = 200000. Nursing: 1000 − floor(1000 × 5 ÷ 7) = 1000 − floor(714.28) = 286.
    // Total 200286.
    const r = run(700_000, 1, [item('room', 700_000), item('nursing', 1_000)]);
    expect(r.deductionPaise).toBe(200_286);
  });

  it('TC-R6-04 pays excluded heads in full', () => {
    // Only the room is cut: 700000 − 500000 = 200000. Implants, pharmacy, diagnostics untouched.
    const r = run(700_000, 1, [
      item('room', 700_000),
      item('implants', 1_000_000),
      item('pharmacy', 50_000),
      item('diagnostics', 30_000),
    ]);
    expect(r.deductionPaise).toBe(200_000);
  });

  it('TC-R6-05 matches the Case B room-rent deduction', () => {
    // Room: 3500000 − 500000 × 5 = 1000000.
    // Associated: 750000 + 3000000 + 1360000 = 5110000; × 5 ÷ 7 = 3650000 exactly → −1460000.
    // Total 2460000. (Consumables are removed by the engine before R6, so they are not here.)
    const r = run(700_000, 5, [
      item('room', 3_500_000),
      item('nursing', 750_000),
      item('surgeon', 3_000_000),
      item('ot', 1_360_000),
      item('implants', 10_500_000),
      item('pharmacy', 1_800_000),
      item('diagnostics', 2_130_000),
    ]);
    expect(r.outcome).toBe('deduction');
    expect(r.deductionPaise).toBe(2_460_000);
  });

  it('TC-R6-06 is unknown when the rent per day is missing', () => {
    const r = run(null, 1, [item('room', 700_000)]);
    expect(r.outcome).toBe('unknown');
    expect(r.missingFacts).toContain('room_rent_per_day');
  });

  it('TC-R6-07 is unknown when the number of room days is missing', () => {
    const r = run(700_000, null, [item('room', 700_000)]);
    expect(r.outcome).toBe('unknown');
    expect(r.missingFacts).toContain('room_days');
  });

  it('TC-R6-08 is not applicable when the plan has no room cap', () => {
    const noCap = { ...plan, roomRent: { kind: 'none' as const, clause: null } };
    const r = run(700_000, 1, [item('room', 700_000)], noCap);
    expect(r.outcome).toBe('pass');
    expect(r.applicable).toBe(false);
    expect(r.deductionPaise).toBe(0);
  });
});
