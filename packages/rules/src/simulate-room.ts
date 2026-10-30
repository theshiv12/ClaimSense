import type { ClaimFacts, Estimate, Paise, PlanConfig, RoomCategory } from '@claimsense/shared';
import { simulateFacts } from './what-if';

export interface RoomScenario {
  category: RoomCategory;
  rentPerDayPaise: Paise;
}

/**
 * What-if for a different room (docs/rules-spec.md, room simulator). The room line becomes
 * rent × days; every other charge is assumed unchanged (the UI must say so). Nothing is saved.
 */
export const simulateRoom = (facts: ClaimFacts, plan: PlanConfig, room: RoomScenario, factsVersion: number): Estimate =>
  simulateFacts(facts, plan, { room }, factsVersion);
