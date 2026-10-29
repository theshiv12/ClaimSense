// @vitest-environment jsdom
import type { Estimate } from '@claimsense/shared';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RoomSimulator } from './room-simulator';

afterEach(cleanup);

// docs/rules-spec.md: twin sharing ₹4,500/day → ₹2,17,900 payable of ₹2,27,500, you pay ₹9,600,
// saving ₹24,600 against Single AC (you pay ₹34,200 there).
const scenario = { claimedPaise: 22_750_000, payablePaise: 21_790_000, outOfPocketPaise: 960_000, verdict: 'likely_partial' } as Estimate;

describe('RoomSimulator', () => {
  it('TC-UI-05 re-runs the estimate for another room and states the assumption', async () => {
    const simulate = vi.fn().mockResolvedValue({ ok: true, data: { estimate: scenario } });
    render(<RoomSimulator claimId="c1" currentOutOfPocketPaise={3_420_000} simulate={simulate} />);
    await userEvent.selectOptions(screen.getByLabelText('Room type'), 'shared');
    await userEvent.clear(screen.getByLabelText('Rent per day (₹)'));
    await userEvent.type(screen.getByLabelText('Rent per day (₹)'), '4500');
    await userEvent.click(screen.getByRole('button', { name: 'Try this room' }));
    expect(simulate).toHaveBeenCalledWith({ claimId: 'c1', category: 'shared', rentPerDayPaise: 450_000 });
    expect(await screen.findByText('₹2,17,900 of ₹2,27,500')).toBeTruthy();
    expect(screen.getByText(/you pay ₹9,600/)).toBeTruthy();
    expect(screen.getByText(/saves ₹24,600/)).toBeTruthy();
    expect(screen.getByText(/Assumes other charges stay the same/)).toBeTruthy();
  });

  it('TC-UI-06 shows an error and never sends an empty rent', async () => {
    const simulate = vi.fn().mockResolvedValue({ ok: false, code: 'NOT_FOUND' });
    render(<RoomSimulator claimId="c1" currentOutOfPocketPaise={0} simulate={simulate} />);
    await userEvent.clear(screen.getByLabelText('Rent per day (₹)'));
    await userEvent.click(screen.getByRole('button', { name: 'Try this room' }));
    expect(simulate).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toBeTruthy();
    await userEvent.type(screen.getByLabelText('Rent per day (₹)'), '4500');
    await userEvent.click(screen.getByRole('button', { name: 'Try this room' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/could not/i);
  });
});
