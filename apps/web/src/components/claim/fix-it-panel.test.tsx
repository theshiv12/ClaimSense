// @vitest-environment jsdom
import type { Estimate, Remedy, RuleResult } from '@claimsense/shared';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CheckRow } from './check-row';

afterEach(cleanup);

// docs/test-cases.md "What can I do?" (TC-FIX-*). Remedies are shaped like config/remedies.json entries.
const remedy = (id: string, ruleId: Remedy['ruleId'], outcome: Remedy['outcome'], title: string): Remedy => ({
  id, ruleId, outcome, title, body: 'A remedy body long enough for the schema.',
});
const R6_REMEDIES = [
  remedy('r6-deduction-room', 'R6', 'deduction', "Choose a room within your policy's limit"),
  remedy('r6-deduction-billing', 'R6', 'deduction', 'Ask whether the hospital uses room-based billing'),
  remedy('r6-deduction-upgrade', 'R6', 'deduction', 'Check for a higher sum insured or room upgrade at renewal'),
];
const R7_REMEDY = remedy('r7-deduction-plan', 'R7', 'deduction', 'Budget for the co-payment');

const clause = { clauseId: '2(A)', page: 5, quote: 'Room, Boarding, Nursing Expenses all inclusive', source: 'wording' as const };
const result = (patch: Partial<RuleResult>): RuleResult => ({
  ruleId: 'R6', outcome: 'pass', applicable: true, reasonCode: 'R6_WITHIN_CAP', deductionPaise: 0,
  clause, usedFacts: [], missingFacts: [], params: {}, ...patch,
});
// Case B: Single AC ₹7,000/day over the ₹5,000/day cap (docs/rules-spec.md).
const r6Cut = result({
  outcome: 'deduction', reasonCode: 'R6_ROOM_OVER_CAP', deductionPaise: 2_460_000,
  params: { capPerDayPaise: 500_000, rentPerDayPaise: 700_000, days: 5, roomDeductionPaise: 1_000_000, associatedDeductionPaise: 1_460_000 },
});
const fix = (remedies: Remedy[], simulate = vi.fn()) => ({ claimId: 'c1', remedies, currentOutOfPocketPaise: 3_420_000, simulate });

describe('What can I do?', () => {
  it('TC-FIX-01 the button opens only that check’s remedies', async () => {
    // The page passes remedies already filtered to this rule and outcome; an R7 one must never show here.
    render(<ul><CheckRow result={r6Cut} fix={fix(R6_REMEDIES)} /></ul>);
    const button = screen.getByRole('button', { name: 'What can I do?' });
    expect(button.getAttribute('aria-expanded')).toBe('false');
    await userEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    for (const r of R6_REMEDIES) expect(screen.getByText(r.title)).toBeTruthy();
    expect(screen.queryByText(R7_REMEDY.title)).toBeNull();
    await userEvent.click(button);
    expect(screen.queryByText(R6_REMEDIES[0]!.title)).toBeNull();
  });

  it('TC-FIX-02 R6 deduction: one-click room within the limit, run by the engine', async () => {
    // Case B, twin sharing at the ₹5,000 cap: bill 2,30,000, payable 2,20,400, you pay 9,600 (see test-cases.md).
    const scenario = { claimedPaise: 23_000_000, payablePaise: 22_040_000, outOfPocketPaise: 960_000, verdict: 'likely_partial' } as Estimate;
    const simulate = vi.fn().mockResolvedValue({ ok: true, data: { estimate: scenario } });
    render(<ul><CheckRow result={r6Cut} fix={fix(R6_REMEDIES, simulate)} /></ul>);
    await userEvent.click(screen.getByRole('button', { name: 'What can I do?' }));
    await userEvent.click(screen.getByRole('button', { name: 'Try a room within the limit' }));
    expect(simulate).toHaveBeenCalledWith({ claimId: 'c1', category: 'shared', rentPerDayPaise: 500_000 });
    expect(await screen.findByText('₹2,20,400 of ₹2,30,000')).toBeTruthy();
    expect(screen.getByText(/you pay ₹9,600/)).toBeTruthy();
    expect(screen.getByText(/saves ₹24,600/)).toBeTruthy();
    expect(screen.getByText(/Assumes other charges stay the same/)).toBeTruthy();
  });

  it('TC-FIX-03 unknown: links to add each missing fact', async () => {
    const unknown = result({ outcome: 'unknown', reasonCode: 'R6_UNKNOWN', missingFacts: ['room_rent_per_day', 'room_days'] });
    render(<ul><CheckRow result={unknown} fix={fix([remedy('r6-unknown-rent', 'R6', 'unknown', 'Add the room rent per day and number of days')])} /></ul>);
    await userEvent.click(screen.getByRole('button', { name: 'What can I do?' }));
    expect(screen.getByRole('link', { name: 'Add Room rent per day' }).getAttribute('href')).toBe('/claims/c1/facts?add=room_rent_per_day');
    expect(screen.getByRole('link', { name: 'Add Days in room' }).getAttribute('href')).toBe('/claims/c1/facts?add=room_days');
  });

  it('TC-FIX-04 fail: medical advice first, escalation steps, disclaimer', async () => {
    const fail = result({ ruleId: 'R2', outcome: 'fail', reasonCode: 'R2_WITHIN_INITIAL_WAIT', params: { waitEnds: '2027-01-10', days: 30 } });
    const { container } = render(<ul><CheckRow result={fail} fix={fix([remedy('r2-fail-plan', 'R2', 'fail', 'Plan non-urgent treatment after the waiting period')])} /></ul>);
    await userEvent.click(screen.getByRole('button', { name: 'What can I do?' }));
    const panel = screen.getByRole('region', { name: /What you can do/ });
    const advice = panel.textContent.indexOf('Medical advice comes first');
    expect(advice).toBeGreaterThanOrEqual(0);
    expect(advice).toBeLessThan(panel.textContent.indexOf('Plan non-urgent treatment after the waiting period'));
    expect(panel.textContent).toContain('Insurance Ombudsman');
    expect(panel.textContent).toContain('Estimate, not a guarantee. Only your insurer decides. Not medical or legal advice.');
    expect(container.textContent).not.toMatch(/approved/i);
  });

  it('TC-FIX-05 no button when there is nothing to offer', () => {
    render(<ul><CheckRow result={result({})} fix={fix(R6_REMEDIES)} /></ul>);
    expect(screen.queryByRole('button', { name: 'What can I do?' })).toBeNull();
    cleanup();
    render(<ul><CheckRow result={r6Cut} fix={fix([])} /></ul>);
    expect(screen.queryByRole('button', { name: 'What can I do?' })).toBeNull();
  });
});
