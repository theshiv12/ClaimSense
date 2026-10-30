// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
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

describe('FactsBoard upload wait', () => {
  const pdf = () => new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], 'a.pdf', { type: 'application/pdf' });

  it('TC-UI-UPL-01 shows progress and what to expect', async () => {
    vi.useFakeTimers();
    const upload = vi.fn(() => new Promise<never>(() => {}));
    render(<FactsBoard claimId="c1" initial={[]} actions={{ ...actions, upload }} />);
    fireEvent.change(screen.getByLabelText('Upload a document'), { target: { files: [pdf()] } });
    await act(() => vi.advanceTimersByTimeAsync(30_000)); // React applies the ticks inside act
    expect(screen.getByRole('status').textContent).toMatch(/Reading your document… 30 s/);
    expect(screen.getByText(/can take up to 2 minutes/)).toBeTruthy();
    vi.useRealTimers();
  });

  it('TC-UI-UPL-02 the wait ends with a way forward; a late answer is ignored', async () => {
    vi.useFakeTimers();
    let answer: (v: unknown) => void = () => {};
    const upload = vi.fn(() => new Promise((resolve) => (answer = resolve))) as unknown as (form: FormData) => Promise<never>;
    render(<FactsBoard claimId="c1" initial={[]} actions={{ ...actions, upload }} />);
    fireEvent.change(screen.getByLabelText('Upload a document'), { target: { files: [pdf()] } });
    await act(() => vi.advanceTimersByTimeAsync(150_000));
    expect(screen.getByRole('alert').textContent).toMatch(/took too long/);
    expect(screen.getByLabelText('What')).toBeTruthy(); // manual form open
    expect(screen.getByText('Upload a document')).toBeTruthy(); // not "Reading…" any more
    answer({ ok: true, data: { facts: [{ id: 'late', key: 'sum_insured', head: 'none', value: 1, status: 'found', source: 'document', documentId: 'd', sourceQuote: 'q', page: 1, confidence: 'high', verification: 'exact', confirmedByUser: false }], needsYou: 0, warnings: [] } });
    await act(() => vi.advanceTimersByTimeAsync(10));
    expect(screen.queryByText('Document 1')).toBeNull();
    vi.useRealTimers();
  });
});
