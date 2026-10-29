import { describe, it } from 'vitest';
import { LoadablePlanConfigSchema, PlanConfigSchema } from './plan-config.schema';
import { accepts, rejects } from './test-helpers';

// Synthetic values for schema shape only.
const ref = (clauseId: string) => ({
  clauseId,
  page: 3,
  quote: `Synthetic clause ${clauseId}, written for schema tests only.`,
  source: 'wording' as const,
});

const plan = (roomRent: unknown = { kind: 'fixed_per_day', capPaise: 500_000, icuCapPaise: null, clause: ref('2.1') }) => ({
  planId: 'test-plan',
  insurer: 'Test Insurer',
  planName: 'Test Plan',
  uin: 'TEST-UIN-001',
  wordingVersion: 'T.1',
  rulesAsOf: '2026-10-28',
  verifiedBy: 'test',
  initialWait: { days: 30, accidentExempt: true, clause: ref('1.1') },
  specificDiseaseWait: { months: 24, accidentExempt: true, clause: ref('1.2'), conditions: [] },
  pedWait: { months: 36, clause: ref('1.3') },
  moratorium: { months: 60, clause: ref('1.4') },
  roomRent,
  proportionateDeduction: { applies: true, excludedHeads: ['implants'], headsVerified: true, clause: ref('2.2') },
  nonPayableHeads: { heads: ['consumables'], clause: ref('N1') },
  coPay: { tiers: [], clause: null },
  sumInsured: { optionsPaise: [30_000_000], clause: ref('4.1') },
});

const tiers = (t: unknown[]) => ({ kind: 'by_sum_insured', tiers: t, icuCapPaise: null, clause: ref('2(A)') });

describe('Room rent by sum insured', () => {
  it('TC-SH-13 accepts per-day and room-category tiers', () => {
    accepts(
      PlanConfigSchema,
      plan(
        tiers([
          { minSumInsuredPaise: 10_000_000, cap: { type: 'per_day', capPaise: 200_000 } },
          { minSumInsuredPaise: 30_000_000, cap: { type: 'per_day', capPaise: 500_000 } },
          { minSumInsuredPaise: 50_000_000, cap: { type: 'category', maxCategory: 'single' } },
        ]),
      ),
    );
    rejects(PlanConfigSchema, plan(tiers([])));
    rejects(PlanConfigSchema, plan(tiers([{ minSumInsuredPaise: 0, cap: { type: 'per_day', capPaise: 1.5 } }])));
    rejects(PlanConfigSchema, plan(tiers([{ minSumInsuredPaise: 0, cap: { type: 'category', maxCategory: 'palace' } }])));
  });
});

describe('Loadable plan config', () => {
  it('TC-SH-14 rejects a plan with any clause still flagged needsReview', () => {
    accepts(LoadablePlanConfigSchema, plan());
    const flagged = plan();
    flagged.pedWait.clause = { ...ref('1.3'), needsReview: true, note: 'check' } as typeof flagged.pedWait.clause;
    rejects(LoadablePlanConfigSchema, flagged);
    accepts(PlanConfigSchema, flagged);
  });
});
