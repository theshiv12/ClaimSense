import { z } from 'zod';
import { BillHead, RoomCategory } from './fact-key';
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

/** One row of a room-rent table keyed by sum insured: a rupee cap per day, or a room category. */
export const RoomRentTierSchema = z.object({
  minSumInsuredPaise: PaiseSchema,
  cap: z.discriminatedUnion('type', [
    z.object({ type: z.literal('per_day'), capPaise: PaiseSchema }),
    z.object({ type: z.literal('category'), maxCategory: RoomCategory }),
  ]),
});
export type RoomRentTier = z.infer<typeof RoomRentTierSchema>;

/** At least one tier, in strictly ascending minSumInsuredPaise, so the engine picks the right row. */
export const RoomRentTiersSchema = z
  .array(RoomRentTierSchema)
  .min(1)
  .refine((t) => t.every((tier, i) => i === 0 || tier.minSumInsuredPaise > (t[i - 1]?.minSumInsuredPaise ?? -1)), {
    message: 'Room rent tiers must be in strictly ascending minSumInsuredPaise',
  });

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
    z.object({
      kind: z.literal('by_sum_insured'),
      tiers: RoomRentTiersSchema,
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

const hasReviewFlag = (value: unknown): boolean =>
  Array.isArray(value)
    ? value.some(hasReviewFlag)
    : typeof value === 'object' && value !== null &&
      Object.entries(value).some(([k, v]) => k === 'needsReview' || hasReviewFlag(v));

/** What the app loads from config/plans: the strict schema, and no clause still flagged for review. */
export const LoadablePlanConfigSchema = PlanConfigSchema.refine((plan) => !hasReviewFlag(plan), {
  message: 'A loaded plan must not have needsReview on any clause; only a human clears it',
});
