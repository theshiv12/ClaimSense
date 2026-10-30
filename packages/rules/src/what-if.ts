import type { ClaimFacts, Estimate, IsoDate, Paise, PlanConfig, RoomCategory } from '@claimsense/shared';
import { estimate } from './engine';

/** One hypothetical change (FR-17). Each field is optional; anything not given stays as in the facts. */
export interface WhatIfPatch {
  isAccident?: boolean;
  room?: { category: RoomCategory; rentPerDayPaise: Paise };
  admissionDate?: IsoDate;
  pedDisclosed?: boolean;
  sumInsuredPaise?: Paise;
}

/**
 * A different room: the room line becomes rent × days; every other charge is assumed unchanged (the UI must
 * say so). Without days there is nothing to reprice, so only the room facts change.
 */
const withRoom = (facts: ClaimFacts, room: NonNullable<WhatIfPatch['room']>): ClaimFacts => {
  const days = facts.room.days;
  const scenario: ClaimFacts = { ...facts, room: { ...room, days } };
  if (days === null) return scenario;
  const oldHead = facts.room.category === 'icu' ? 'icu' : 'room';
  const others = facts.bill.lineItems.filter((i) => i.head !== oldHead);
  const oldRoom = facts.bill.lineItems.filter((i) => i.head === oldHead).reduce((s, i) => s + i.amountPaise, 0);
  const newRoom = room.rentPerDayPaise * days;
  const lineItems = [{ head: room.category === 'icu' ? ('icu' as const) : ('room' as const), amountPaise: newRoom }, ...others];
  const totalPaise = facts.bill.totalPaise === null ? null : facts.bill.totalPaise - oldRoom + newRoom;
  return { ...scenario, bill: { totalPaise, lineItems } };
};

/** What-if (FR-17): the same facts with one change, through the same engine. Nothing is saved. */
export const simulateFacts = (facts: ClaimFacts, plan: PlanConfig, patch: WhatIfPatch, factsVersion: number): Estimate => {
  let f: ClaimFacts = facts;
  if (patch.room) f = withRoom(f, patch.room);
  if (patch.isAccident !== undefined) f = { ...f, isAccident: patch.isAccident };
  if (patch.admissionDate !== undefined) f = { ...f, admissionDate: patch.admissionDate };
  if (patch.pedDisclosed !== undefined) f = { ...f, ped: { ...f.ped, disclosed: patch.pedDisclosed } };
  if (patch.sumInsuredPaise !== undefined) f = { ...f, sumInsuredPaise: patch.sumInsuredPaise };
  return estimate(f, plan, factsVersion);
};
