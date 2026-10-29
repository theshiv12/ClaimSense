import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ClaimFactsSchema, PlanConfigSchema, type RuleId } from '@claimsense/shared';
import { fixture } from '../test/factories';
import { estimate } from './engine';

// `pnpm cases`: fixtures/cases/<id> through the engine on the real, verified plan config.
// Expected values are hand-calculated; the arithmetic is in each expected.json (`_arithmetic`).
interface Expected {
  verdict: string;
  claimedPaise: number;
  nonPayablePaise: number;
  payablePaise: number;
  payableIfEligiblePaise: number;
  outOfPocketPaise: number;
  results: Partial<Record<RuleId, { outcome: string; deductionPaise?: number }>>;
}

const loadPlan = (planId: string) => {
  const url = new URL(`../../../config/plans/${planId}.json`, import.meta.url);
  if (!existsSync(url)) throw new Error(`config/plans/${planId}.json not found: verify the draft and move it out of drafts/`);
  return PlanConfigSchema.parse(JSON.parse(readFileSync(url, 'utf8')));
};

const cases = {
  A: 'TC-CASE-A inside the initial wait is at_risk',
  B: 'TC-CASE-B knee replacement in Single AC matches the worked example exactly',
  C: 'TC-CASE-C cataract inside 24 months is at_risk',
  D: 'TC-CASE-D appendicitis within the room cap is likely_payable',
} as const;

describe('Sample cases', () => {
  for (const [id, name] of Object.entries(cases)) {
    it(name, () => {
      const facts = ClaimFactsSchema.parse(fixture(id, 'case'));
      const want = fixture(id, 'expected') as Expected;
      const e = estimate(facts, loadPlan(facts.planId), 1);

      expect(e).toMatchObject({
        verdict: want.verdict,
        claimedPaise: want.claimedPaise,
        nonPayablePaise: want.nonPayablePaise,
        payablePaise: want.payablePaise,
        payableIfEligiblePaise: want.payableIfEligiblePaise,
        outOfPocketPaise: want.outOfPocketPaise,
      });
      for (const [ruleId, r] of Object.entries(want.results)) {
        expect(e.results.find((x) => x.ruleId === ruleId), ruleId).toMatchObject(r);
      }
    });
  }
});
