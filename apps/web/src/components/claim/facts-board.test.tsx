// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
});
