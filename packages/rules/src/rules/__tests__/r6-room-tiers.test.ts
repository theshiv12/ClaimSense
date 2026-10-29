import { describe, expect, it } from 'vitest';
import type { ClaimFacts, PlanConfig, RoomCategory } from '@claimsense/shared';
import { facts, testPlan } from '../../../test/factories';
import { r6RoomRent } from '../r6-room-rent';

// ADR-007: room cap by sum insured (Star FHO 2(A) shape, synthetic values).
// Tiers: SI ≥ 10000000 → 200000/day; ≥ 30000000 → 500000/day; ≥ 50000000 → up to a single room.
const base = testPlan();
const tiered: PlanConfig = {
  ...base,
  roomRent: {
    kind: 'by_sum_insured',
    tiers: [
      { minSumInsuredPaise: 10_000_000, cap: { type: 'per_day', capPaise: 200_000 } },
      { minSumInsuredPaise: 30_000_000, cap: { type: 'per_day', capPaise: 500_000 } },
      { minSumInsuredPaise: 50_000_000, cap: { type: 'category', maxCategory: 'single' } },
    ],
    icuCapPaise: null,
    clause: base.roomRent.clause!,
  },
};
type Item = ClaimFacts['bill']['lineItems'][number];
const item = (head: Item['head'], amountPaise: number): Item => ({ head, amountPaise });
const run = (o: { si: number | null; category?: RoomCategory; rent: number; days?: number; items: Item[]; plan?: PlanConfig }) => {
  const total = o.items.reduce((s, i) => s + i.amountPaise, 0);
  const f = facts({
    sumInsuredPaise: o.si,
    room: { category: o.category ?? 'single', rentPerDayPaise: o.rent, days: o.days ?? 1 },
    bill: { totalPaise: total, lineItems: o.items },
  });
  return r6RoomRent(f, o.plan ?? tiered, total);
};

describe('R6 room rent by sum insured', () => {
  it('TC-R6-09 uses the ₹5,000 tier for SI ₹3 lakh (Case B)', () => {
    // Same arithmetic as TC-R6-05: 1000000 room + 1460000 associated = 2460000.
    const r = run({
      si: 30_000_000, rent: 700_000, days: 5,
      items: [item('room', 3_500_000), item('nursing', 750_000), item('surgeon', 3_000_000), item('ot', 1_360_000),
        item('implants', 10_500_000), item('pharmacy', 1_800_000), item('diagnostics', 2_130_000)],
    });
    expect(r.outcome).toBe('deduction');
    expect(r.deductionPaise).toBe(2_460_000);
  });

  it('TC-R6-10 uses the ₹2,000 tier for SI ₹2 lakh', () => {
    // Room 300000 − 200000 = 100000. Nursing 30000 − floor(30000 × 200000 ÷ 300000) = 30000 − 20000 = 10000.
    const r = run({ si: 20_000_000, rent: 300_000, items: [item('room', 300_000), item('nursing', 30_000)] });
    expect(r.deductionPaise).toBe(110_000);
  });

  it('TC-R6-11 passes a room within the allowed category', () => {
    const r = run({ si: 50_000_000, category: 'single', rent: 700_000, items: [item('room', 700_000)] });
    expect(r.outcome).toBe('pass');
    expect(r.deductionPaise).toBe(0);
  });

  it('TC-R6-12 is unknown, never pass, for a room above the allowed category', () => {
    const r = run({ si: 50_000_000, category: 'deluxe', rent: 900_000, items: [item('room', 900_000)] });
    expect(r.outcome).toBe('unknown');
    expect(r.missingFacts).toContain('room_category');
  });

  it('TC-R6-13 is unknown when the sum insured is missing', () => {
    const r = run({ si: null, rent: 700_000, items: [item('room', 700_000)] });
    expect(r.outcome).toBe('unknown');
    expect(r.missingFacts).toContain('sum_insured');
  });

  it('TC-R6-14 is unknown when the sum insured is below every tier', () => {
    const r = run({ si: 5_000_000, rent: 100_000, items: [item('room', 100_000)] });
    expect(r.outcome).toBe('unknown');
    expect(r.missingFacts).toContain('sum_insured');
  });

  it('TC-R6-15 does not cap ICU when the plan has no ICU cap', () => {
    const r = run({ si: 30_000_000, category: 'icu', rent: 2_000_000, items: [item('icu', 2_000_000)], plan: base });
    expect(r.outcome).toBe('pass');
    expect(r.deductionPaise).toBe(0);
  });

  it('TC-R6-16 caps at a percentage of the sum insured per day', () => {
    // 30000000 × 100 ÷ 10000 = 300000/day. Room 400000 − 300000 = 100000.
    const pct: PlanConfig = { ...base, roomRent: { kind: 'pct_of_si_per_day', bps: 100, icuBps: null, clause: base.roomRent.clause! } };
    expect(run({ si: 30_000_000, rent: 400_000, items: [item('room', 400_000)], plan: pct }).deductionPaise).toBe(100_000);
    const unknown = run({ si: null, rent: 400_000, items: [item('room', 400_000)], plan: pct });
    expect(unknown.outcome).toBe('unknown');
    expect(unknown.missingFacts).toContain('sum_insured');
  });
});
