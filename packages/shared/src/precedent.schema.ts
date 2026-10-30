import { z } from 'zod';
import { IsoDateSchema } from './primitives';
import { RuleId } from './rule-result.schema';

/**
 * A public decision (Insurance Ombudsman, IRDAI, consumer court) about the same kind of check: shown as
 * "similar cases" and used as a chat source (ADR-010). Never invented: each entry links its source and is
 * verified by a human before it loads, like plan configs (ADR-007).
 */
const PrecedentBase = z.object({
  id: z.string().regex(/^[a-z0-9-]{3,80}$/),
  forum: z.enum(['ombudsman', 'irdai', 'consumer_court']),
  title: z.string().min(5).max(160),
  decisionDate: IsoDateSchema,
  insurer: z.string().min(2).max(120).nullable(),
  planName: z.string().min(2).max(120).nullable(),
  ruleId: RuleId,
  outcome: z.enum(['fail', 'deduction', 'unknown']),
  result: z.enum(['complainant_won', 'insurer_upheld', 'partly_allowed']),
  summary: z.string().min(40).max(600),
  sourceUrl: z.url({ protocol: /^https$/ }),
  citation: z.string().min(3).max(160),
});

export const PrecedentSchema = PrecedentBase.extend({ verifiedBy: z.string().min(2).max(80) }).strict();
export type Precedent = z.infer<typeof PrecedentSchema>;

/** config/precedents/drafts: what a human still has to check against the source. Never loaded. */
export const DraftPrecedentSchema = PrecedentBase.extend({
  verifiedBy: z.null(),
  needsReview: z.literal(true),
  note: z.string().min(5).max(400),
}).strict();

const uniqueIds = (cases: { id: string }[]) => new Set(cases.map((c) => c.id)).size === cases.length;

/** config/precedents.json: only reviewed entries (strict: a `needsReview` key fails to load). */
export const PrecedentCatalogSchema = z
  .object({ version: z.number().int().positive(), cases: z.array(PrecedentSchema).refine(uniqueIds, { message: 'Precedent ids must be unique' }) })
  .strict();
export type PrecedentCatalog = z.infer<typeof PrecedentCatalogSchema>;

export const DraftPrecedentCatalogSchema = z
  .object({
    version: z.number().int().positive(),
    pendingHumanReview: z.array(z.string()),
    cases: z.array(DraftPrecedentSchema).refine(uniqueIds, { message: 'Precedent ids must be unique' }),
  })
  .strict();
