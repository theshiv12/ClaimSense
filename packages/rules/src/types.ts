import type { ClaimFacts, Paise, PlanConfig, RuleResult } from '@claimsense/shared';

/** R1–R5: eligibility, from the facts and the plan only. */
export type EligibilityRule = (facts: ClaimFacts, plan: PlanConfig) => RuleResult;

/** R6–R8: amount rules, applied to the running amount in waterfall order. */
export type AmountRule = (facts: ClaimFacts, plan: PlanConfig, runningPaise: Paise) => RuleResult;
