import { z } from 'zod';
import { BillHead, FactKey, RoomCategory } from './fact-key';
import { IsoDateSchema, PaiseSchema } from './primitives';

export const FactStatus = z.enum(['found', 'not_found', 'illegible']);
export type FactStatus = z.infer<typeof FactStatus>;

export const FactSource = z.enum(['document', 'user-stated', 'user-corrected']);
export type FactSource = z.infer<typeof FactSource>;

export const Confidence = z.enum(['high', 'medium', 'low']);
export type Confidence = z.infer<typeof Confidence>;

export const Verification = z.enum(['exact', 'fuzzy', 'none', 'unverifiable']);
export type Verification = z.infer<typeof Verification>;

/** The value type each fact key holds once normalised (money in paise, dates YYYY-MM-DD). */
export const FACT_VALUE_SCHEMAS = {
  plan_uin: z.string().min(1),
  policy_start_date: IsoDateSchema,
  policy_end_date: IsoDateSchema,
  first_inception_date: IsoDateSchema,
  sum_insured: PaiseSchema,
  sum_insured_used: PaiseSchema,
  age_at_entry: z.number().int().min(0).max(120),
  admission_date: IsoDateSchema,
  discharge_date: IsoDateSchema,
  diagnosis: z.string().min(1),
  diagnosis_icd10: z.string().min(1),
  is_accident: z.boolean(),
  ped_exists: z.boolean(),
  ped_condition: z.string().min(1),
  ped_first_diagnosed_date: IsoDateSchema,
  ped_disclosed: z.boolean(),
  room_category: RoomCategory,
  room_rent_per_day: PaiseSchema,
  room_days: z.number().int().min(0).max(365),
  bill_total: PaiseSchema,
  bill_line_item: PaiseSchema,
} satisfies Record<FactKey, z.ZodType>;

/** The normalised value type of one fact key. */
export type FactValueOf<K extends FactKey> = z.infer<(typeof FACT_VALUE_SCHEMAS)[K]>;

export const FactValueSchema = z.union([z.string(), z.number(), z.boolean()]).nullable();
export type FactValue = z.infer<typeof FactValueSchema>;

/** One traceable fact (golden rule 3). `head` is 'none' except for bill line items. */
export const FactSchema = z
  .object({
    key: FactKey,
    head: BillHead,
    value: FactValueSchema,
    status: FactStatus,
    source: FactSource,
    documentId: z.string().min(1).nullable(),
    sourceQuote: z.string().nullable(),
    page: z.number().int().positive().nullable(),
    confidence: Confidence,
    verification: Verification,
    confirmedByUser: z.boolean(),
  })
  .superRefine((f, ctx) => {
    if (f.source === 'document' && f.documentId === null)
      ctx.addIssue({ code: 'custom', path: ['documentId'], message: 'A document fact needs its documentId' });
    if (f.source === 'document' && f.status === 'found' && (!f.sourceQuote || f.page === null))
      ctx.addIssue({ code: 'custom', path: ['sourceQuote'], message: 'A found document fact needs its quote and page' });
    if (f.source !== 'document' && f.verification !== 'none')
      ctx.addIssue({ code: 'custom', path: ['verification'], message: 'Only document facts have a quote to verify' });
    if (f.status === 'found' && f.value === null)
      ctx.addIssue({ code: 'custom', path: ['value'], message: 'A found fact needs a value' });
    if (f.value !== null && !FACT_VALUE_SCHEMAS[f.key].safeParse(f.value).success)
      ctx.addIssue({ code: 'custom', path: ['value'], message: `Wrong value type for ${f.key}` });
    if ((f.key === 'bill_line_item') !== (f.head !== 'none'))
      ctx.addIssue({ code: 'custom', path: ['head'], message: 'Only bill_line_item has a head, and it always has one' });
  });
export type Fact = z.infer<typeof FactSchema>;
