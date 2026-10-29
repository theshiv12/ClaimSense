import 'server-only';
import { ClaimFactsSchema, type ClaimFacts } from '@claimsense/shared';
import a from '../../../../fixtures/cases/A/case.json';
import b from '../../../../fixtures/cases/B/case.json';
import c from '../../../../fixtures/cases/C/case.json';
import d from '../../../../fixtures/cases/D/case.json';

// Synthetic sample cases (fixtures/cases/README.md). No AI call is made for them.
export const SAMPLES: Record<'A' | 'B' | 'C' | 'D', { facts: ClaimFacts; relation: string; treatment: string }> = {
  A: { facts: ClaimFactsSchema.parse(a), relation: 'self', treatment: 'Gastroenteritis, inside the 30-day wait' },
  B: { facts: ClaimFactsSchema.parse(b), relation: 'parent', treatment: 'Knee replacement (right)' },
  C: { facts: ClaimFactsSchema.parse(c), relation: 'self', treatment: 'Cataract surgery' },
  D: { facts: ClaimFactsSchema.parse(d), relation: 'self', treatment: 'Appendix surgery' },
};
