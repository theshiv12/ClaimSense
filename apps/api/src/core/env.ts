import { z } from 'zod';

// Every variable is listed in apps/api/.env.example (CLAUDE.md golden rule 7). Read lazily, so the app
// starts without secrets and a missing value fails at the first request that needs it.
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
  PORT: z.coerce.number().int().positive().default(4000),
  /** The web app's origin: the only one allowed to send writes (core/origin.ts). */
  WEB_ORIGIN: z.url().default('http://localhost:3000'),
  /** Express `trust proxy`: 'true', 'false', a hop count, or names like 'loopback' (README, deploy). */
  TRUST_PROXY: z.string().min(1).default('loopback'),
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
