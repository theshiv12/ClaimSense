import { z } from 'zod';
import { RuleId } from './rule-result.schema';

/** config/remedies.json: what a policyholder can do about one rule outcome (golden rule 10). */
export const RemedySchema = z.object({
  id: z.string().min(1),
  ruleId: RuleId,
  outcome: z.enum(['fail', 'deduction', 'unknown']),
  title: z.string().min(5).max(120),
  body: z.string().min(20).max(600),
});
export type Remedy = z.infer<typeof RemedySchema>;

export const RemediesCatalogSchema = z.object({
  version: z.number().int().positive(),
  remedies: z
    .array(RemedySchema)
    .refine((r) => new Set(r.map((x) => x.id)).size === r.length, { message: 'Remedy ids must be unique' }),
});
export type RemediesCatalog = z.infer<typeof RemediesCatalogSchema>;
