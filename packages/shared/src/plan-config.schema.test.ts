import { describe, it } from 'vitest';
import { ClauseRefSchema, PlanConfigSchema } from './plan-config.schema';
import { accepts, rejects } from './test-helpers';

// Synthetic values for schema shape only. Real plan values live in config/plans.
const ref = (clauseId: string, source = 'wording') => ({
  clauseId,
  page: 3,
  quote: `Synthetic clause ${clauseId}, written for schema tests only.`,
  source,
});

const plan = () => ({
  planId: 'test-plan',
  insurer: 'Test Insurer',
  planName: 'Test Plan',
  uin: 'TEST-UIN-001',
  wordingVersion: 'T.1',
  rulesAsOf: '2026-10-28',
  verifiedBy: 'test',
  initialWait: { days: 30, accidentExempt: true, clause: ref('1.1') },
  specificDiseaseWait: {
    months: 24,
    accidentExempt: true,
    clause: ref('1.2'),
    conditions: [{ id: 'cataract', label: 'Cataract', icd10Prefixes: ['H25'], keywords: ['cataract'] }],
  },
  pedWait: { months: 36, clause: ref('1.3') },
  moratorium: { months: 60, clause: ref('M1', 'regulation') },
  roomRent: { kind: 'fixed_per_day', capPaise: 500_000, icuCapPaise: null, clause: ref('2.1') },
  proportionateDeduction: {
    applies: true,
    excludedHeads: ['implants', 'pharmacy', 'diagnostics'],
    headsVerified: false,
    clause: ref('2.2'),
  },
  nonPayableHeads: { heads: ['consumables'], clause: ref('N1', 'regulation') },
  coPay: { tiers: [{ minAgeAtEntry: 61, bps: 2000 }], clause: ref('3.1') },
  sumInsured: { optionsPaise: [30_000_000, 40_000_000], clause: ref('4.1') },
});

describe('ClauseRef', () => {
  it('TC-SH-02 needs a clause id, a positive page, a quote of 20+ chars and a known source', () => {
    accepts(ClauseRefSchema, { clauseId: '3(2)', page: 12, quote: 'A quote that is long enough.', source: 'wording' });
    accepts(ClauseRefSchema, ref('M1', 'regulation'));
    accepts(ClauseRefSchema, { ...ref('2(A)'), needsReview: true, note: 'Table garbled in the PDF' });

    rejects(ClauseRefSchema, { ...ref('3(2)'), quote: 'Too short.' }); // 10 chars
    rejects(ClauseRefSchema, { ...ref('3(2)'), page: 0 });
    rejects(ClauseRefSchema, { ...ref('3(2)'), source: 'memory' });
    rejects(ClauseRefSchema, { ...ref('3(2)'), clauseId: undefined });
  });
});

describe('PlanConfig', () => {
  it('TC-SH-03 holds every rule value and the non-payable heads, each with its clause', () => {
    const p = plan();
    accepts(PlanConfigSchema, p);

    rejects(PlanConfigSchema, { ...p, nonPayableHeads: undefined });
    rejects(PlanConfigSchema, { ...p, roomRent: { ...p.roomRent, kind: 'per_room_type' } });
    rejects(PlanConfigSchema, { ...p, roomRent: { ...p.roomRent, capPaise: 500_000.5 } });
    rejects(PlanConfigSchema, { ...p, coPay: { ...p.coPay, tiers: [{ minAgeAtEntry: 61, bps: 10_001 }] } });
    rejects(PlanConfigSchema, { ...p, initialWait: { ...p.initialWait, clause: undefined } });
    rejects(PlanConfigSchema, {
      ...p,
      proportionateDeduction: { ...p.proportionateDeduction, excludedHeads: ['implants', 'food'] },
    });
  });
});
