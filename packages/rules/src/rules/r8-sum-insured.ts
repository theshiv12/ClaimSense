import { deduct, missing, unknown } from '../result';
import type { AmountRule } from '../types';

/** R8: the running amount is capped at sum insured − sum insured already used. */
export const r8SumInsured: AmountRule = (f, plan, runningPaise) => {
  const b = { ruleId: 'R8' as const, clause: plan.sumInsured.clause, usedFacts: ['sum_insured' as const, 'sum_insured_used' as const] };
  const { sumInsuredPaise: si, sumInsuredUsedPaise: used } = f;
  if (si === null || used === null) return unknown(b, missing([['sum_insured', si], ['sum_insured_used', used]]));
  const remaining = Math.max(0, si - used);
  return deduct(b, Math.max(0, runningPaise - remaining), 'R8_OVER_SUM_INSURED', 'R8_WITHIN_SUM_INSURED', { remainingPaise: remaining });
};
