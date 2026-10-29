import { RuleId } from '@claimsense/shared';

/** Rule identifiers, in evaluation order. Values and clauses live in config/plans, never here. */
export const RULE_IDS = RuleId.options;

export type { AmountRule, EligibilityRule } from './types';
export { ENGINE_VERSION, estimate } from './engine';
export { simulateRoom, type RoomScenario } from './simulate-room';
export { isUsable, toClaimFacts } from './to-claim-facts';
export { addDays, addMonths } from './dates';
export { r1PolicyActive } from './rules/r1-policy-active';
export { r2InitialWait } from './rules/r2-initial-wait';
export { r3SpecificDiseaseWait } from './rules/r3-specific-disease-wait';
export { r4PedWait } from './rules/r4-ped-wait';
export { r5Moratorium } from './rules/r5-moratorium';
export { r6RoomRent } from './rules/r6-room-rent';
export { r7CoPay } from './rules/r7-co-pay';
export { r8SumInsured } from './rules/r8-sum-insured';
