// @vitest-environment jsdom
import type { Precedent } from '@claimsense/shared';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SimilarCases } from './similar-cases';

afterEach(cleanup);

const won: Precedent = {
  id: 'synthetic-1', forum: 'ombudsman', title: 'Synthetic: proportionate deduction on medicines', decisionDate: '2024-03-15',
  insurer: 'Example Health', planName: null, ruleId: 'R6', outcome: 'deduction', result: 'complainant_won',
  summary: 'A synthetic summary for tests: the forum held that medicines are not reduced in proportion to room rent.',
  sourceUrl: 'https://example.org/award/1', citation: 'Synthetic award 1/2024', verifiedBy: 'tester',
};

describe('SimilarCases', () => {
  it('TC-UI-PREC-01 shows each reviewed case with its source; empty state', () => {
    const { container } = render(<SimilarCases cases={[won]} />);
    expect(screen.getByText('Insurance Ombudsman · 15 Mar 2024')).toBeTruthy();
    expect(screen.getByText('Decided for the policyholder')).toBeTruthy();
    expect(container.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    const link = screen.getByRole('link', { name: /Read the decision/ });
    expect(link.getAttribute('href')).toBe('https://example.org/award/1');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(screen.getByText(/Past decisions do not bind your insurer/)).toBeTruthy();
    cleanup();
    render(<SimilarCases cases={[]} />);
    expect(screen.getByText(/No reviewed cases yet/)).toBeTruthy();
  });

  it('TC-UI-PREC-02 the decision link says it opens a new tab', () => {
    render(<SimilarCases cases={[won]} />);
    expect(screen.getByRole('link', { name: /opens in a new tab/ })).toBeTruthy();
  });
});

