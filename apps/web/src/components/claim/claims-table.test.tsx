// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ClaimSummary } from '@claimsense/shared';
import { ClaimsTable } from './claims-table';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/lib/api/client', () => ({ deleteClaim: vi.fn(), deleteMe: vi.fn() }));
afterEach(cleanup);

const row = (patch: Partial<ClaimSummary>): ClaimSummary => ({
  id: 'x', treatment: 'Appendix surgery', relation: 'self', verdict: null, payablePaise: null, claimedPaise: null, outOfPocketPaise: null,
  createdAt: '2026-10-29', expiresAt: '2026-11-05', sampleCaseId: null, planName: 'Plan', wordingVersion: 'V.19', ...patch,
});

describe('ClaimsTable', () => {
  it('TC-UI-16 searches in the browser, never through the URL', async () => {
    const { container } = render(<ClaimsTable claims={[row({ id: 'b', treatment: 'Knee replacement (right)' }), row({ id: 'd' })]} status="all" />);
    await userEvent.type(screen.getByLabelText('Search by person or treatment'), 'knee');
    expect(screen.getByText('Knee replacement (right)')).toBeTruthy();
    expect(screen.queryByText('Appendix surgery')).toBeNull();
    expect(container.querySelector('form[method="get"], form[action]')).toBeNull();
  });
});
