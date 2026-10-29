// Usage: pnpm --filter @claimsense/web check:env
// Loads .env.local the way `next dev` does and reports what is wrong, never the values.
import { mongoUriHint, mongoUriProblem } from '../src/lib/mongo-uri.ts';

const problem = mongoUriProblem(process.env.MONGODB_URI);
if (problem) console.error(`✗ ${mongoUriHint(problem)}`);
else console.log('✓ MONGODB_URI looks well-formed');
for (const name of ['MONGODB_DB', 'GEMINI_API_KEY']) {
  if (!process.env[name]) console.error(`✗ ${name} is not set`);
}
process.exitCode = problem ? 1 : 0;
