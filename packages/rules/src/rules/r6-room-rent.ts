import type { ClaimFacts, PlanConfig, RoomCategory } from '@claimsense/shared';
import { deduct, missing, notApplicable, pass, unknown } from '../result';
import type { AmountRule } from '../types';

// ICU never reaches the category check (it has its own cap), so its rank only completes the map.
const CATEGORY_RANK: Record<RoomCategory, number> = { general: 0, shared: 1, single: 2, deluxe: 3, suite: 4, icu: 5 };

type Cap = { kind: 'per_day'; capPaise: number } | { kind: 'none' } | { kind: 'category'; maxCategory: RoomCategory } | { kind: 'unknown'; missing: 'sum_insured' };

/** The plan's per-day cap for this room (Engine decision 5: ICU uses its own cap; null = no cap). */
type CappedRoomRent = Exclude<PlanConfig['roomRent'], { kind: 'none' }>;

const capFor = (f: ClaimFacts, rr: CappedRoomRent): Cap => {
  const icu = f.room.category === 'icu';
  const si = f.sumInsuredPaise;
  if (rr.kind === 'fixed_per_day') {
    const cap = icu ? rr.icuCapPaise : rr.capPaise;
    return cap === null ? { kind: 'none' } : { kind: 'per_day', capPaise: cap };
  }
  if (rr.kind === 'pct_of_si_per_day') {
    const bps = icu ? rr.icuBps : rr.bps;
    if (bps === null) return { kind: 'none' };
    return si === null ? { kind: 'unknown', missing: 'sum_insured' } : { kind: 'per_day', capPaise: Math.floor((si * bps) / 10_000) };
  }
  if (icu) return rr.icuCapPaise === null ? { kind: 'none' } : { kind: 'per_day', capPaise: rr.icuCapPaise };
  if (si === null) return { kind: 'unknown', missing: 'sum_insured' };
  const tier = rr.tiers.filter((t) => t.minSumInsuredPaise <= si).at(-1);
  if (!tier) return { kind: 'unknown', missing: 'sum_insured' };
  return tier.cap.type === 'per_day' ? { kind: 'per_day', capPaise: tier.cap.capPaise } : { kind: 'category', maxCategory: tier.cap.maxCategory };
};

/**
 * R6: rent ≤ cap → no deduction. Otherwise the room head is paid at min(room, cap × days) and every
 * head not in excludedHeads is paid × cap ÷ rent (floored once on their total). Non-payables are already removed.
 */
export const r6RoomRent: AmountRule = (f, plan, runningPaise) => {
  const clause = plan.roomRent.clause;
  const b = {
    ruleId: 'R6' as const,
    clause,
    usedFacts: ['room_category' as const, 'room_rent_per_day' as const, 'room_days' as const, 'bill_line_item' as const],
  };
  const roomRent = plan.roomRent;
  if (roomRent.kind === 'none') return notApplicable(b, 'R6_NO_CAP');
  if (f.bill.lineItems.length === 0 || runningPaise === 0) return unknown(b, ['bill_line_item'], 'R6_NO_BILL');
  const { rentPerDayPaise: rent, days } = f.room;
  if (rent === null || days === null) return unknown(b, missing([['room_rent_per_day', rent], ['room_days', days]]));

  const cap = capFor(f, roomRent);
  if (cap.kind === 'none') return pass(b, 'R6_NO_CAP_FOR_ROOM');
  if (cap.kind === 'unknown') return unknown(b, [cap.missing], 'R6_NO_TIER_FOR_SUM_INSURED');
  if (cap.kind === 'category') {
    const category = f.room.category;
    if (category === null) return unknown(b, ['room_category']);
    return CATEGORY_RANK[category] <= CATEGORY_RANK[cap.maxCategory]
      ? pass(b, 'R6_ROOM_WITHIN_CATEGORY', { maxCategory: cap.maxCategory })
      : unknown(b, ['room_category'], 'R6_ABOVE_ELIGIBLE_CATEGORY');
  }

  const capPaise = cap.capPaise;
  const params = { capPerDayPaise: capPaise, rentPerDayPaise: rent, days };
  if (rent <= capPaise) return pass(b, 'R6_WITHIN_CAP', params);

  const roomHead = f.room.category === 'icu' ? 'icu' : 'room';
  const { applies, excludedHeads } = plan.proportionateDeduction;
  let roomPaise = 0;
  let associatedPaise = 0;
  for (const item of f.bill.lineItems) {
    if (item.head === roomHead) roomPaise += item.amountPaise;
    else if (applies && !excludedHeads.includes(item.head)) associatedPaise += item.amountPaise;
  }
  // One floor over the associated total, as in the Case B arithmetic (51,100 × 5 ÷ 7 = 36,500).
  const associated = associatedPaise - Math.floor((associatedPaise * capPaise) / rent);
  const roomCut = roomPaise - Math.min(roomPaise, capPaise * days);
  const total = Math.min(roomCut + associated, runningPaise);
  return deduct(b, total, 'R6_ROOM_OVER_CAP', 'R6_WITHIN_CAP', { ...params, roomDeductionPaise: roomCut, associatedDeductionPaise: associated });
};
