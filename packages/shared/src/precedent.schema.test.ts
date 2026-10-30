import { describe, expect, it } from 'vitest';
import { DraftPrecedentCatalogSchema, PrecedentCatalogSchema } from './precedent.schema';

// docs/test-cases.md TC-SH-PREC-*. Synthetic entries; real cases live in config/precedents*.json.
const reviewed = {
  id: 'ombudsman-test-room-rent',
  forum: 'ombudsman',
  title: 'Room rent proportionate deduction on associated charges',
  decisionDate: '2024-03-15',
  insurer: 'Example Health Insurance',
  planName: null,
  ruleId: 'R6',
  outcome: 'deduction',
  result: 'partly_allowed',
  summary: 'A synthetic summary used only in tests: the deduction on associated charges was examined against the policy wording.',
  sourceUrl: 'https://example.org/award/1',
  citation: 'Synthetic award 1/2024',
  verifiedBy: 'tester',
};

describe('Precedent catalog', () => {
  it('TC-SH-PREC-01 a reviewed precedent loads', () => {
    expect(PrecedentCatalogSchema.safeParse({ version: 1, cases: [reviewed] }).success).toBe(true);
  });

  it('TC-SH-PREC-02 unreviewed or unsafe entries never load', () => {
    for (const bad of [
      { ...reviewed, needsReview: true },
      { ...reviewed, verifiedBy: null },
      { ...reviewed, sourceUrl: 'http://example.org/award/1' },
    ]) {
      expect(PrecedentCatalogSchema.safeParse({ version: 1, cases: [bad] }).success).toBe(false);
    }
    expect(PrecedentCatalogSchema.safeParse({ version: 1, cases: [reviewed, reviewed] }).success).toBe(false);
  });

  it('TC-SH-PREC-03 drafts hold what a human must check', () => {
    const draft = { ...reviewed, verifiedBy: null, needsReview: true, note: 'Check the award text and date.' };
    expect(DraftPrecedentCatalogSchema.safeParse({ version: 1, pendingHumanReview: [draft.id], cases: [draft] }).success).toBe(true);
    expect(PrecedentCatalogSchema.safeParse({ version: 1, cases: [draft] }).success).toBe(false);
  });
});
