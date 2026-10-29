import 'server-only';
import { z } from 'zod';

// Every variable is listed in .env.example (CLAUDE.md golden rule 7). Read lazily, so a build without
// secrets still works and a missing value fails at the first request that needs it.
const EnvSchema = z.object({
  MONGODB_URI: z.string().min(1),
  MONGODB_DB: z.string().min(1).default('claimsense'),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL_EXTRACT: z.string().min(1).default('gemini-3.8-flash'),
  GEMINI_MODEL_FALLBACK: z.string().min(1).default('gemini-3.5-flash-lite'),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(7),
  CLAIM_TTL_DAYS: z.coerce.number().int().positive().default(7),
  GUEST_TTL_HOURS: z.coerce.number().int().positive().default(24),
  MAX_UPLOAD_MB: z.coerce.number().positive().max(4).default(4),
  MAX_FILES_PER_CLAIM: z.coerce.number().int().positive().default(8),
  AI_DAILY_EXTRACTIONS_PER_USER: z.coerce.number().int().nonnegative().default(6),
});
export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

export const env = (): Env => {
  if (!cached) {
    const parsed = EnvSchema.safeParse(process.env);
    // Names only: never print values.
    if (!parsed.success) throw new Error(`Invalid env: ${parsed.error.issues.map((i) => i.path.join('.')).join(', ')}`);
    cached = parsed.data;
  }
  return cached;
};
