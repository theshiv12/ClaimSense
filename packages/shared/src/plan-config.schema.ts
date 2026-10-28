import { z } from 'zod';
import { BillHead } from './fact-key';
import { BpsSchema, IsoDateSchema, PaiseSchema } from './primitives';

export const ClauseRefSchema = z.object({
  clauseId: z.string().min(1), // as printed: '3(2)', 'Excl 02'
  page: z.number().int().positive(),
  quote: z.string().min(20), // verbatim from the wording
  source: z.enum(['wording', 'regulation']), // 'regulation' only where the wording is silent
  needsReview: z.boolean().optional(), // drafts only; a loaded plan must not set it
  note: z.string().optional(),
});
export type ClauseRef = z.infer<typeof ClauseRefSchema>;

const Count = z.number().int().nonnegative();

export const PlanConfigSchema = z.object({
  planId: z.string(),
  insurer: z.string(),
  planName: z.string(),
  uin: z.string(),
  wordingVersion: z.string(),
  rulesAsOf: IsoDateSchema,
  verifiedBy: z.string(),
  initialWait: z.object({ days: Count, accidentExempt: z.boolean(), clause: ClauseRefSchema }),
  specificDiseaseWait: z.object({
    months: Count,
    accidentExempt: z.boolean(),
    clause: ClauseRefSchema,
    conditions: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        icd10Prefixes: z.array(z.string()),
        keywords: z.array(z.string()),
      }),
    ),
  }),
  pedWait: z.object({ months: Count, clause: ClauseRefSchema }),
  moratorium: z.object({ months: Count, clause: ClauseRefSchema }),
  roomRent: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('none'), clause: ClauseRefSchema.nullable() }),
    z.object({
      kind: z.literal('pct_of_si_per_day'),
      bps: BpsSchema,
      icuBps: BpsSchema.nullable(),
      clause: ClauseRefSchema,
    }),
    z.object({
      kind: z.literal('fixed_per_day'),
      capPaise: PaiseSchema,
      icuCapPaise: PaiseSchema.nullable(),
      clause: ClauseRefSchema,
    }),
  ]),
  proportionateDeduction: z.object({
    applies: z.boolean(),
    excludedHeads: z.array(BillHead),
    headsVerified: z.boolean(),
    clause: ClauseRefSchema.nullable(),
  }),
  nonPayableHeads: z.object({ heads: z.array(BillHead), clause: ClauseRefSchema }),
  coPay: z.object({
    tiers: z.array(z.object({ minAgeAtEntry: Count, bps: BpsSchema })),
    clause: ClauseRefSchema.nullable(),
  }),
  sumInsured: z.object({ optionsPaise: z.array(PaiseSchema), clause: ClauseRefSchema }),
});
export type PlanConfig = z.infer<typeof PlanConfigSchema>;
