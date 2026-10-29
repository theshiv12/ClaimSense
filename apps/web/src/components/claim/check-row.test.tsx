// @vitest-environment jsdom
import type { RuleResult } from '@claimsense/shared';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CheckRow } from './check-row';

afterEach(cleanup);

const clause = { clauseId: '2(A)', page: 5, quote: 'Room, Boarding, Nursing Expenses all inclusive as provided by the Hospital', source: 'wording' as const };
const result = (patch: Partial<RuleResult>): RuleResult => ({
  ruleId: 'R6', outcome: 'pass', applicable: true, reasonCode: 'R6_WITHIN_CAP', deductionPaise: 0,
  clause, usedFacts: [], missingFacts: [], params: {}, ...patch,
});

describe('CheckRow', () => {
  it('TC-UI-04 shows an icon and a word for every outcome, the clause and the amount', () => {
    const rows: [Partial<RuleResult>, string][] = [
      [{ outcome: 'pass' }, 'Pass'],
      [{ outcome: 'deduction', deductionPaise: 2_460_000, reasonCode: 'R6_ROOM_OVER_CAP' }, 'Deduction'],
      [{ outcome: 'fail', ruleId: 'R2', reasonCode: 'R2_WITHIN_INITIAL_WAIT' }, 'Fail'],
      [{ outcome: 'unknown', missingFacts: ['room_rent_per_day', 'room_days'] }, 'Unknown'],
    ];
    for (const [patch, word] of rows) {
      const { container } = render(<CheckRow result={result(patch)} />);
      expect(screen.getByText(word)).toBeTruthy();
      expect(container.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
      expect(screen.getByText(/Clause 2\(A\)/)).toBeTruthy();
      expect(container.textContent).not.toMatch(/approved/i);
      cleanup();
    }
    render(<CheckRow result={result({ outcome: 'deduction', deductionPaise: 2_460_000, reasonCode: 'R6_ROOM_OVER_CAP' })} />);
    expect(screen.getByText('−₹24,600')).toBeTruthy();
    cleanup();
    render(<CheckRow result={result({ outcome: 'unknown', missingFacts: ['room_rent_per_day', 'room_days'] })} />);
    expect(screen.getByText(/Room rent per day, Days in room/)).toBeTruthy();
  });
});
