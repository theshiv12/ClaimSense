import type { ClaimFacts, Estimate, PlanConfig, RuleResult, Verdict } from '@claimsense/shared';
import { r1PolicyActive } from './rules/r1-policy-active';
import { r2InitialWait } from './rules/r2-initial-wait';
import { r3SpecificDiseaseWait } from './rules/r3-specific-disease-wait';
import { r4PedWait } from './rules/r4-ped-wait';
import { r5Moratorium } from './rules/r5-moratorium';
import { r6RoomRent } from './rules/r6-room-rent';
import { r7CoPay } from './rules/r7-co-pay';
import { r8SumInsured } from './rules/r8-sum-insured';
import { unknown } from './result';
import type { AmountRule, EligibilityRule } from './types';

export const ENGINE_VERSION = '1.0.0';

const ELIGIBILITY: EligibilityRule[] = [r1PolicyActive, r2InitialWait, r3SpecificDiseaseWait, r4PedWait, r5Moratorium];
const AMOUNT: AmountRule[] = [r6RoomRent, r7CoPay, r8SumInsured];

/**
 * Line items, plus an 'other' line when the stated total is above their sum, so nothing is lost.
 * That amount's head is unknown, so R6 cannot be applied to it (Engine decision 10).
 */
const billLines = (f: ClaimFacts) => {
  const items = f.bill.lineItems;
  const unitemised = Math.max(0, (f.bill.totalPaise ?? 0) - items.reduce((s, i) => s + i.amountPaise, 0));
  return { unitemised, lines: unitemised > 0 ? [...items, { head: 'other' as const, amountPaise: unitemised }] : items };
};

const r6Unitemised = (plan: PlanConfig) =>
  unknown({ ruleId: 'R6', clause: plan.roomRent.clause, usedFacts: ['bill_total', 'bill_line_item'] }, ['bill_line_item'], 'R6_UNITEMISED_AMOUNT');

const verdictOf = (eligibility: RuleResult[], amount: RuleResult[], payable: number, claimed: number): Verdict => {
  if (eligibility.some((r) => r.outcome === 'fail' || r.outcome === 'unknown')) return 'at_risk';
  if (payable < claimed || amount.some((r) => r.outcome === 'unknown')) return 'likely_partial';
  return 'likely_payable';
};

/** Runs R1–R8 in the order of docs/rules-spec.md and builds the estimate. */
export const estimate = (facts: ClaimFacts, plan: PlanConfig, factsVersion: number): Estimate => {
  const eligibility = ELIGIBILITY.map((rule) => rule(facts, plan));

  const { unitemised, lines } = billLines(facts);
  const claimedPaise = lines.reduce((s, i) => s + i.amountPaise, 0);
  const nonPayable = new Set(plan.nonPayableHeads.heads);
  const payableLines = lines.filter((i) => !nonPayable.has(i.head));
  const nonPayablePaise = claimedPaise - payableLines.reduce((s, i) => s + i.amountPaise, 0);
  const amountFacts: ClaimFacts = { ...facts, bill: { ...facts.bill, lineItems: payableLines } };

  let running = claimedPaise - nonPayablePaise;
  const waterfall: Estimate['waterfall'] = [];
  const amount = AMOUNT.map((rule) => {
    const r = rule === r6RoomRent && unitemised > 0 ? r6Unitemised(plan) : rule(amountFacts, plan, running);
    const after = running - r.deductionPaise;
    waterfall.push({ ruleId: r.ruleId, beforePaise: running, afterPaise: after });
    running = after;
    return r;
  });

  const eligible = eligibility.every((r) => r.outcome === 'pass');
  const payablePaise = eligible ? running : 0;
  return {
    verdict: verdictOf(eligibility, amount, payablePaise, claimedPaise),
    claimedPaise,
    nonPayablePaise,
    payablePaise,
    payableIfEligiblePaise: running,
    outOfPocketPaise: claimedPaise - payablePaise,
    waterfall,
    results: [...eligibility, ...amount],
    planId: plan.planId,
    wordingVersion: plan.wordingVersion,
    rulesAsOf: plan.rulesAsOf,
    engineVersion: ENGINE_VERSION,
    factsVersion,
  };
};
