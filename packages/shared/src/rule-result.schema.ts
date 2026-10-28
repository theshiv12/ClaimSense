import { z } from 'zod';
import { FactKey } from './fact-key';
import { ClauseRefSchema } from './plan-config.schema';
import { IsoDateSchema, PaiseSchema } from './primitives';

export const RuleId = z.enum(['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8']);
export type RuleId = z.infer<typeof RuleId>;

export const RuleOutcome = z.enum(['pass', 'deduction', 'fail', 'unknown']);
export type RuleOutcome = z.infer<typeof RuleOutcome>;

export const RuleResultSchema = z
  .object({
    ruleId: RuleId,
    outcome: RuleOutcome,
    applicable: z.boolean(),
    reasonCode: z.string(), // 'R2_WITHIN_INITIAL_WAIT', 'R6_ROOM_OVER_CAP', …
    deductionPaise: PaiseSchema,
    clause: ClauseRefSchema.nullable(),
    usedFacts: z.array(FactKey),
    missingFacts: z.array(FactKey),
    params: z.record(z.string(), z.union([z.string(), z.number()])), // explanation template values
  })
  .superRefine((r, ctx) => {
    if ((r.outcome === 'deduction') !== r.deductionPaise > 0)
      ctx.addIssue({ code: 'custom', path: ['deductionPaise'], message: 'deductionPaise > 0 if and only if outcome is deduction' });
    if ((r.outcome === 'unknown') !== r.missingFacts.length > 0)
      ctx.addIssue({ code: 'custom', path: ['missingFacts'], message: 'missingFacts is non-empty if and only if outcome is unknown' });
  });
export type RuleResult = z.infer<typeof RuleResultSchema>;

export const Verdict = z.enum(['likely_payable', 'likely_partial', 'at_risk']);
export type Verdict = z.infer<typeof Verdict>;

export const EstimateSchema = z.object({
  verdict: Verdict,
  claimedPaise: PaiseSchema,
  nonPayablePaise: PaiseSchema, // removed before R6 (plan.nonPayableHeads)
  payablePaise: PaiseSchema, // 0 when any eligibility rule fails
  payableIfEligiblePaise: PaiseSchema, // the R6–R8 result assuming R1–R5 pass
  outOfPocketPaise: PaiseSchema,
  waterfall: z.array(z.object({ ruleId: RuleId, beforePaise: PaiseSchema, afterPaise: PaiseSchema })),
  results: z.array(RuleResultSchema).length(8),
  planId: z.string(),
  wordingVersion: z.string(),
  rulesAsOf: IsoDateSchema,
  engineVersion: z.string(),
  factsVersion: z.number().int(),
});
export type Estimate = z.infer<typeof EstimateSchema>;
