import type { ClaimFacts, Estimate, Paise, PlanConfig, RoomCategory } from '@claimsense/shared';
import { estimate } from './engine';

export interface RoomScenario {
  category: RoomCategory;
  rentPerDayPaise: Paise;
}

/**
 * What-if for a different room (docs/rules-spec.md, room simulator). The room line becomes
 * rent × days; every other charge is assumed unchanged (the UI must say so). Nothing is saved.
 */
export const simulateRoom = (facts: ClaimFacts, plan: PlanConfig, room: RoomScenario, factsVersion: number): Estimate => {
  const days = facts.room.days;
  const scenario: ClaimFacts = { ...facts, room: { ...room, days } };
  if (days !== null) {
    const oldHead = facts.room.category === 'icu' ? 'icu' : 'room';
    const others = facts.bill.lineItems.filter((i) => i.head !== oldHead);
    const oldRoom = facts.bill.lineItems.length - others.length > 0
      ? facts.bill.lineItems.filter((i) => i.head === oldHead).reduce((s, i) => s + i.amountPaise, 0)
      : 0;
    const newRoom = room.rentPerDayPaise * days;
    const lineItems = [{ head: room.category === 'icu' ? ('icu' as const) : ('room' as const), amountPaise: newRoom }, ...others];
    const totalPaise = facts.bill.totalPaise === null ? null : facts.bill.totalPaise - oldRoom + newRoom;
    scenario.bill = { totalPaise, lineItems };
  }
  return estimate(scenario, plan, factsVersion);
};
