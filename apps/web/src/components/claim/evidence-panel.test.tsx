// @vitest-environment jsdom
import type { RuleResult } from '@claimsense/shared';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { EvidencePanel } from './evidence-panel';

afterEach(cleanup);

const result: RuleResult = {
  ruleId: 'R6', outcome: 'deduction', applicable: true, reasonCode: 'R6_ROOM_OVER_CAP', deductionPaise: 2_460_000,
  clause: { clauseId: '2(A)', page: 5, quote: 'up to Rs. 5,000 per day for Sum Insured of Rs. 3 lakhs to 4 lakhs', source: 'wording' },
  usedFacts: ['room_rent_per_day'], missingFacts: [], params: {},
};

describe('EvidencePanel', () => {
  it('TC-UI-11 shows the policy clause and the line from the user’s own document', () => {
    render(
      <EvidencePanel
        result={result}
        lines={[
          { key: 'room_rent_per_day', quote: 'Room charges (Single AC) 7,000 × 5', page: 1, usable: true },
          { key: 'room_days', quote: 'a misread line', page: 2, usable: false },
        ]}
      />,
    );
    expect(screen.getByText('From your policy · p.5')).toBeTruthy();
    expect(screen.getByText(/up to Rs. 5,000 per day/)).toBeTruthy();
    expect(screen.getByText('From your documents · p.1')).toBeTruthy();
    expect(screen.getByText(/Room charges \(Single AC\) 7,000 × 5/)).toBeTruthy();
    expect(screen.queryByText(/a misread line/)).toBeNull();
  });
});
