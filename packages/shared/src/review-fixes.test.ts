import { describe, it } from 'vitest';
import { FactSchema } from './fact.schema';
import { LoadablePlanConfigSchema, PlanConfigSchema } from './plan-config.schema';
import { RemediesCatalogSchema } from './remedies.schema';
import { accepts, rejects } from './test-helpers';

// Synthetic values only.
const ref = (clauseId: string) => ({
  clauseId,
  page: 3,
  quote: `Synthetic clause ${clauseId}, written for schema tests only.`,
  source: 'wording' as const,
});
const fact = (patch: Record<string, unknown> = {}) => ({
  key: 'admission_date', head: 'none', value: '2026-11-18', status: 'found', source: 'document',
  documentId: 'doc-1', sourceQuote: 'Date of admission: 18/11/2026', page: 1, confidence: 'high',
  verification: 'exact', confirmedByUser: false, ...patch,
});
const plan = (roomRent: unknown, extra: Record<string, unknown> = {}) => ({
  planId: 'p', insurer: 'I', planName: 'P', uin: 'U', wordingVersion: 'T.1', rulesAsOf: '2026-10-28', verifiedBy: 'test',
  initialWait: { days: 30, accidentExempt: true, clause: { ...ref('1.1'), ...extra } },
  specificDiseaseWait: { months: 24, accidentExempt: true, clause: ref('1.2'), conditions: [] },
  pedWait: { months: 36, clause: ref('1.3') }, moratorium: { months: 60, clause: ref('1.4') },
  roomRent,
  proportionateDeduction: { applies: true, excludedHeads: [], headsVerified: true, clause: null },
  nonPayableHeads: { heads: [], clause: ref('N1') }, coPay: { tiers: [], clause: null },
  sumInsured: { optionsPaise: [30_000_000], clause: ref('4.1') },
});
const perDay = (min: number, cap: number) => ({ minSumInsuredPaise: min, cap: { type: 'per_day', capPaise: cap } });
const tiers = (t: unknown[]) => ({ kind: 'by_sum_insured', tiers: t, icuCapPaise: null, clause: ref('2(A)') });
const remedy = (id: string) => ({ id, ruleId: 'R1', outcome: 'fail', title: 'Do a thing', body: 'A body that is long enough to pass.' });

describe('Review fixes', () => {
  it('TC-SH-17 tightens facts, room tiers, loadable plans and remedy ids', () => {
    rejects(FactSchema, fact({ sourceQuote: null }));
    rejects(FactSchema, fact({ sourceQuote: '' }));
    rejects(FactSchema, fact({ page: null }));
    rejects(FactSchema, fact({ source: 'user-stated', documentId: null, sourceQuote: null, page: null }));
    accepts(FactSchema, fact({ source: 'user-stated', documentId: null, sourceQuote: null, page: null, verification: 'none' }));

    accepts(PlanConfigSchema, plan(tiers([perDay(10_000_000, 200_000), perDay(30_000_000, 500_000)])));
    rejects(PlanConfigSchema, plan(tiers([perDay(30_000_000, 500_000), perDay(10_000_000, 200_000)])));
    rejects(PlanConfigSchema, plan(tiers([perDay(10_000_000, 200_000), perDay(10_000_000, 500_000)])));

    const room = { kind: 'none', clause: null };
    accepts(LoadablePlanConfigSchema, plan(room));
    rejects(LoadablePlanConfigSchema, plan(room, { needsReview: false }));

    accepts(RemediesCatalogSchema, { version: 1, remedies: [remedy('a'), remedy('b')] });
    rejects(RemediesCatalogSchema, { version: 1, remedies: [remedy('a'), remedy('a')] });
  });
});
