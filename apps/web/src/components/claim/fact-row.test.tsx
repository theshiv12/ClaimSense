// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StoredFactView } from '@/lib/fact-view';
import { FactRow } from './fact-row';

afterEach(cleanup);

const fact = (patch: Partial<StoredFactView> = {}): StoredFactView => ({
  id: 'f1', key: 'sum_insured', head: 'none', value: 30_000_000, status: 'found', source: 'document',
  documentId: 'd1', sourceQuote: 'Sum Insured (Rs.) 3,00,000', page: 1, confidence: 'high',
  verification: 'none', confirmedByUser: false, usable: false, ...patch,
});

describe('FactRow', () => {
  it('TC-UI-07 shows verified vs please-check, the quote and page, and confirms', async () => {
    const confirm = vi.fn().mockResolvedValue({ ok: true, data: { fact: fact({ confirmedByUser: true, usable: true }) } });
    render(<FactRow claimId="c1" fact={fact()} actions={{ confirm, edit: vi.fn() }} />);
    expect(screen.getByText('Please check')).toBeTruthy();
    expect(screen.getByText('Sum insured')).toBeTruthy();
    expect(screen.getByText('₹3,00,000')).toBeTruthy();
    expect(screen.getByText(/“Sum Insured \(Rs\.\) 3,00,000”/)).toBeTruthy();
    expect(screen.getByText(/page 1/)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm Sum insured' }));
    expect(confirm).toHaveBeenCalledWith({ claimId: 'c1', factId: 'f1' });
    expect(await screen.findByText('Confirmed')).toBeTruthy();
    cleanup();
    render(<FactRow claimId="c1" fact={fact({ verification: 'exact', usable: true })} actions={{ confirm, edit: vi.fn() }} />);
    expect(screen.getByText('Verified')).toBeTruthy();
  });
});
