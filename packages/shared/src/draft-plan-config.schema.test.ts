import { describe, expect, it } from 'vitest';
import { DraftClauseRefSchema, DraftPlanConfigSchema } from './draft-plan-config.schema';
import { PlanConfigSchema } from './plan-config.schema';
import { accepts, rejects } from './test-helpers';

// Synthetic values for schema shape only, same as the TC-SH-03 fixture.
const ref = (clauseId: string, source = 'wording') => ({
  clauseId,
  page: 3,
  quote: `Synthetic clause ${clauseId}, written for schema tests only.`,
  source,
});

const notStated = (note = 'Wording is silent on this.') => ({
  clauseId: null,
  page: null,
  quote: null,
  source: null,
  needsReview: true,
  note,
});

const draft = () => ({
  planId: 'test-plan',
  insurer: 'Test Insurer',
  planName: 'Test Plan',
  uin: 'TEST-UIN-001',
  wordingVersion: 'T.1',
  rulesAsOf: '2026-10-28',
  verifiedBy: null,
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

const flagged = (clauseId: string, note: string) => ({ ...ref(clauseId), needsReview: true, note });

describe('DraftPlanConfig', () => {
  it('TC-SH-06 accepts a fully extracted plan that nobody has verified yet', () => {
    const d = draft();
    expect(DraftPlanConfigSchema.parse(d)).toEqual(d);

    rejects(DraftPlanConfigSchema, { ...d, verifiedBy: 'test' }); // a draft is never verified
  });

  it('TC-SH-07 allows a value the wording does not state, when it is flagged', () => {
    const d = draft();
    const gap = { ...d, pedWait: { months: null, clause: notStated('Wording is silent on the PED wait.') } };
    accepts(DraftPlanConfigSchema, gap);
    rejects(PlanConfigSchema, gap);

    accepts(DraftPlanConfigSchema, {
      ...d,
      roomRent: { kind: 'unknown', clause: flagged('2(A)', 'Room-rent table garbled in the PDF.') },
    });
    accepts(DraftPlanConfigSchema, {
      ...d,
      specificDiseaseWait: {
        ...d.specificDiseaseWait,
        conditions: null,
        clause: flagged('3(2)', 'Disease list is on a page that was not provided.'),
      },
    });
    accepts(DraftPlanConfigSchema, { ...d, coPay: { tiers: [], clause: ref('3.1') } }); // wording says none
    accepts(DraftPlanConfigSchema, { ...d, uin: null, notes: ['UIN not printed on the pages provided.'] });
  });

  it('TC-SH-08 rejects a gap that is not flagged', () => {
    const d = draft();
    const noFlag = { ...notStated(), needsReview: undefined };
    const noNote = { ...notStated(), note: undefined };

    rejects(DraftPlanConfigSchema, { ...d, pedWait: { months: null, clause: noFlag } });
    rejects(DraftPlanConfigSchema, { ...d, pedWait: { months: null, clause: noNote } });
    rejects(DraftPlanConfigSchema, { ...d, pedWait: { months: null, clause: notStated('') } });
    rejects(DraftPlanConfigSchema, { ...d, pedWait: { months: null, clause: ref('1.3') } });
    rejects(DraftPlanConfigSchema, { ...d, roomRent: { kind: 'unknown', clause: ref('2(A)') } });
    rejects(DraftPlanConfigSchema, { ...d, uin: null });
  });

  it('TC-SH-09 rejects half-filled clause refs', () => {
    const quoteNoPage = { ...ref('3(1)'), page: null };
    const pageShortQuote = { ...ref('3(1)'), page: 12, quote: 'Too short.' };

    accepts(DraftClauseRefSchema, ref('3(1)'));
    accepts(DraftClauseRefSchema, notStated());
    rejects(DraftClauseRefSchema, quoteNoPage);
    rejects(DraftClauseRefSchema, pageShortQuote);

    const d = draft();
    rejects(DraftPlanConfigSchema, { ...d, pedWait: { months: 36, clause: quoteNoPage } });
    rejects(DraftPlanConfigSchema, { ...d, pedWait: { months: 36, clause: pageShortQuote } });
  });

  it('TC-SH-10 keeps every range check when values may be null', () => {
    const d = draft();
    rejects(DraftPlanConfigSchema, { ...d, coPay: { ...d.coPay, tiers: [{ minAgeAtEntry: 61, bps: 10_001 }] } });
    rejects(DraftPlanConfigSchema, { ...d, initialWait: { ...d.initialWait, days: -1 } });
    rejects(DraftPlanConfigSchema, { ...d, nonPayableHeads: { ...d.nonPayableHeads, heads: ['food'] } });
    rejects(DraftPlanConfigSchema, { ...d, sumInsured: { ...d.sumInsured, optionsPaise: [1.5] } });
  });
});
