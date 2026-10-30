// @vitest-environment jsdom
import type { EstimateView, RuleResult } from '@claimsense/shared';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SummaryView } from './summary-view';

afterEach(cleanup);

// docs/test-cases.md TC-UI-SUM-01: FR-12, Case B (docs/rules-spec.md: ₹2,05,800 of ₹2,40,000, you pay ₹34,200).
const check = (ruleId: RuleResult['ruleId'], outcome: RuleResult['outcome'], deductionPaise = 0): RuleResult => ({
  ruleId, outcome, applicable: true, reasonCode: outcome === 'deduction' ? 'R6_ROOM_OVER_CAP' : 'R1_POLICY_ACTIVE', deductionPaise,
  clause: { clauseId: ruleId === 'R6' ? '2(A)' : '1', page: 5, quote: 'A clause quote long enough.', source: 'wording' },
  usedFacts: [], missingFacts: [], params: ruleId === 'R6' ? { rentPerDayPaise: 700_000, capPerDayPaise: 500_000, roomDeductionPaise: 1_000_000, associatedDeductionPaise: 1_460_000 } : { admissionDate: '2026-11-18' },
});
const view = {
  claim: { id: 'c1', planId: 'star-fho', relation: 'parent', treatment: 'Knee replacement (right)', sampleCaseId: 'B' },
  plan: { planName: 'Family Health Optima', wordingVersion: 'V.19', uin: 'UIN1', rulesAsOf: '2026-10-28' },
  estimate: {
    verdict: 'likely_partial', claimedPaise: 24_000_000, payablePaise: 20_580_000, outOfPocketPaise: 3_420_000, nonPayablePaise: 960_000,
    payableIfEligiblePaise: 20_580_000, factsVersion: 1, engineVersion: '1', results: [check('R1', 'pass'), check('R6', 'deduction', 2_460_000)],
  },
  remedies: [{ id: 'r6-deduction-room', ruleId: 'R6', outcome: 'deduction', title: "Choose a room within your policy's limit", body: 'A body long enough for the schema.' }],
  evidence: {}, precedents: {}, clarifiers: [], needsYou: 0,
} as unknown as EstimateView;

describe('SummaryView', () => {
  it('TC-UI-SUM-01 a printable summary of the estimate', () => {
    const { container } = render(<SummaryView view={view} />);
    const text = container.textContent ?? '';
    expect(text).toContain('Likely partly paid');
    expect(text).toContain('₹2,05,800 of ₹2,40,000');
    expect(text).toContain('you pay ₹34,200');
    expect(text).toContain('Room rent limit');
    expect(text).toContain('Clause 2(A)');
    expect(text).toContain("Choose a room within your policy's limit");
    expect(text).toContain('Insurance Ombudsman');
    expect(text).toContain('Estimate, not a guarantee. Only your insurer decides. Not medical or legal advice.');
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeTruthy();
    expect(text).not.toMatch(/approved/i);
  });
});
