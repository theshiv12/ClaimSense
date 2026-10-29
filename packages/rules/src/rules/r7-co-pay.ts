import { deduct, notApplicable, unknown } from '../result';
import type { AmountRule } from '../types';

/** R7: the highest tier with minAgeAtEntry ≤ ageAtEntry takes floor(running × bps ÷ 10000). */
export const r7CoPay: AmountRule = (f, plan, runningPaise) => {
  const { tiers, clause } = plan.coPay;
  const b = { ruleId: 'R7' as const, clause, usedFacts: ['age_at_entry' as const] };
  if (tiers.length === 0) return notApplicable(b, 'R7_NO_CO_PAY');
  if (f.ageAtEntry === null) return unknown(b, ['age_at_entry']);
  const age = f.ageAtEntry;
  const tier = [...tiers].sort((x, y) => x.minAgeAtEntry - y.minAgeAtEntry).filter((t) => t.minAgeAtEntry <= age).at(-1);
  if (!tier) return notApplicable(b, 'R7_BELOW_CO_PAY_AGE');
  const amount = Math.floor((runningPaise * tier.bps) / 10_000);
  return deduct(b, amount, 'R7_CO_PAY', 'R7_CO_PAY_ZERO', { bps: tier.bps, minAgeAtEntry: tier.minAgeAtEntry, ageAtEntry: age });
};
