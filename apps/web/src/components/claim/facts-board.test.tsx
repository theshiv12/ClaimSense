// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StoredFactView } from '@/lib/fact-view';
import { FactsBoard } from './facts-board';

afterEach(cleanup);

const actions = { confirm: vi.fn(), edit: vi.fn(), add: vi.fn(), upload: vi.fn() };

describe('FactsBoard', () => {
  it('TC-FIX-06 opens the manual form for the fact asked for', () => {
    render(<FactsBoard claimId="c1" initial={[]} actions={actions} initialAddKey="room_days" />);
    const what = screen.getByLabelText<HTMLSelectElement>('What');
    expect(what.value).toBe('room_days');
    expect(what.selectedOptions[0]?.textContent).toBe('Days in room');
    cleanup();
    render(<FactsBoard claimId="c1" initial={[]} actions={actions} initialAddKey="not_a_key" />);
    expect(screen.queryByLabelText('What')).toBeNull();
  });

  it('TC-FIX-06b a value read from a document is confirmed, not overridden by a new one', () => {
    // Engine decision 13: a user-stated fact beats the document. So when the document already has a value
    // waiting for the user's check, point at it instead of opening a blank form.
    const pending: StoredFactView = {
      id: 'f1', key: 'room_days', head: 'none', value: 5, status: 'found', source: 'document', documentId: 'd1',
      sourceQuote: 'Room charges (Single AC) 7,000 x 5', page: 1, confidence: 'medium', verification: 'none',
      confirmedByUser: false, usable: false,
    };
    render(<FactsBoard claimId="c1" initial={[pending]} actions={actions} initialAddKey="room_days" />);
    expect(screen.queryByLabelText('What')).toBeNull();
    expect(screen.getByText(/Days in room was read from your document: confirm it or correct it below/)).toBeTruthy();
  });
});
