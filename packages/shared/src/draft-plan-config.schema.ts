import { z } from 'zod';
import { BillHead } from './fact-key';
import { ClauseRefSchema, PlanConfigSchema, RoomRentTiersSchema } from './plan-config.schema';
import { BpsSchema, PaiseSchema } from './primitives';

// Drafts in config/plans/drafts/ only. The loader uses the strict PlanConfigSchema.
// null = the wording is silent; [] = the wording says there are none.

/** A clause the wording does not contain at all: every field null, always flagged. */
const NotStatedRefSchema = z.object({
  clauseId: z.null(),
  page: z.null(),
  quote: z.null(),
  source: z.null(),
  needsReview: z.literal(true),
  note: z.string().min(1),
});

/** Either a fully found ClauseRef or a fully not-stated one; never half-filled. */
export const DraftClauseRefSchema = z.union([ClauseRefSchema, NotStatedRefSchema]);
export type DraftClauseRef = z.infer<typeof DraftClauseRefSchema>;

const Count = z.number().int().nonnegative();

type Clause = { needsReview?: boolean; note?: string } | null;

const isFlagged = (clause: Clause) => clause?.needsReview === true && !!clause.note;

const requireFlag = (ctx: z.RefinementCtx) =>
  ctx.addIssue({ code: 'custom', path: ['clause'], message: 'A gap needs needsReview: true and a note' });

/** A section with a null value must flag its clause with needsReview and a note. */
const flagsGaps =
  (keys: string[]) =>
  (section: { clause: Clause } & Record<string, unknown>, ctx: z.RefinementCtx) => {
    if (keys.some((k) => section[k] === null) && !isFlagged(section.clause)) requireFlag(ctx);
  };

// kind 'unknown' is itself a gap, so its clause must always be flagged.
const unknownRoomRent = z
  .object({ kind: z.literal('unknown'), clause: DraftClauseRefSchema })
  .superRefine((r, ctx) => {
    if (!isFlagged(r.clause)) requireFlag(ctx);
  });

export const DraftPlanConfigSchema = PlanConfigSchema.extend({
  uin: z.string().nullable(),
  wordingVersion: z.string().nullable(),
  verifiedBy: z.null(), // a draft is never verified
  notes: z.array(z.string().min(1)).optional(),
  initialWait: z
    .object({ days: Count.nullable(), accidentExempt: z.boolean().nullable(), clause: DraftClauseRefSchema })
    .superRefine(flagsGaps(['days', 'accidentExempt'])),
  specificDiseaseWait: z
    .object({
      months: Count.nullable(),
      accidentExempt: z.boolean().nullable(),
      clause: DraftClauseRefSchema,
      conditions: PlanConfigSchema.shape.specificDiseaseWait.shape.conditions.nullable(),
    })
    .superRefine(flagsGaps(['months', 'accidentExempt', 'conditions'])),
  pedWait: z
    .object({ months: Count.nullable(), clause: DraftClauseRefSchema })
    .superRefine(flagsGaps(['months'])),
  moratorium: z
    .object({ months: Count.nullable(), clause: DraftClauseRefSchema })
    .superRefine(flagsGaps(['months'])),
  roomRent: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('none'), clause: DraftClauseRefSchema.nullable() }),
    z.object({
      kind: z.literal('pct_of_si_per_day'),
      bps: BpsSchema,
      icuBps: BpsSchema.nullable(),
      clause: DraftClauseRefSchema,
    }),
    z.object({
      kind: z.literal('fixed_per_day'),
      capPaise: PaiseSchema,
      icuCapPaise: PaiseSchema.nullable(),
      clause: DraftClauseRefSchema,
    }),
    z.object({
      kind: z.literal('by_sum_insured'),
      tiers: RoomRentTiersSchema,
      icuCapPaise: PaiseSchema.nullable(),
      clause: DraftClauseRefSchema,
    }),
    unknownRoomRent,
  ]),
  proportionateDeduction: z
    .object({
      applies: z.boolean().nullable(),
      excludedHeads: z.array(BillHead).nullable(),
      headsVerified: z.boolean(),
      clause: DraftClauseRefSchema.nullable(),
    })
    .superRefine(flagsGaps(['applies', 'excludedHeads'])),
  nonPayableHeads: z
    .object({ heads: z.array(BillHead).nullable(), clause: DraftClauseRefSchema })
    .superRefine(flagsGaps(['heads'])),
  coPay: z
    .object({
      tiers: PlanConfigSchema.shape.coPay.shape.tiers.nullable(),
      clause: DraftClauseRefSchema.nullable(),
    })
    .superRefine(flagsGaps(['tiers'])),
  sumInsured: z
    .object({ optionsPaise: z.array(PaiseSchema).nullable(), clause: DraftClauseRefSchema })
    .superRefine(flagsGaps(['optionsPaise'])),
}).superRefine((plan, ctx) => {
  if ((plan.uin === null || plan.wordingVersion === null) && !plan.notes?.length) {
    ctx.addIssue({ code: 'custom', path: ['notes'], message: 'A null uin or wordingVersion needs a note' });
  }
});
export type DraftPlanConfig = z.infer<typeof DraftPlanConfigSchema>;
