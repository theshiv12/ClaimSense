// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PayoutBar } from './payout-bar';

afterEach(cleanup);

describe('PayoutBar', () => {
  it('TC-UI-02 sizes the payable and you-pay segments from the estimate (Case B)', () => {
    // 20580000 ÷ 24000000 = 85.75%; you pay 14.25%.
    render(<PayoutBar claimedPaise={24_000_000} payablePaise={20_580_000} />);
    expect(screen.getByTestId('payout-payable').style.width).toBe('85.75%');
    expect(screen.getByTestId('payout-you-pay').style.width).toBe('14.25%');
    expect(screen.getByText('₹2,05,800 of ₹2,40,000')).toBeTruthy();
    expect(screen.getByRole('img', { name: /₹2,05,800 of ₹2,40,000 likely paid; you pay ₹34,200/ })).toBeTruthy();
  });

  it('TC-UI-03 handles nothing payable and nothing claimed', () => {
    render(<PayoutBar claimedPaise={1_000_000} payablePaise={0} />);
    expect(screen.getByTestId('payout-payable').style.width).toBe('0%');
    expect(screen.getByTestId('payout-you-pay').style.width).toBe('100%');
    cleanup();
    const { container } = render(<PayoutBar claimedPaise={0} payablePaise={0} />);
    expect(container.innerHTML).not.toContain('NaN');
    expect(screen.queryByTestId('payout-payable')).toBeNull();
  });
});

describe('PayoutBar breakdown', () => {
  it('TC-UI-09 splits what you pay into its causes, with a legend', () => {
    // you pay 34,200 = 24,600 room rent + 9,600 non-payables → 71.93% / 28.07% of the you-pay segment.
    render(
      <PayoutBar
        claimedPaise={24_000_000}
        payablePaise={20_580_000}
        breakdown={[
          { label: 'Room-rent deduction', paise: 2_460_000 },
          { label: 'Non-payables', paise: 960_000 },
        ]}
      />,
    );
    expect(screen.getByTestId('payout-you-pay').style.width).toBe('14.25%');
    expect(screen.getByTestId('payout-part-0').style.width).toBe('71.93%');
    expect(screen.getByTestId('payout-part-1').style.width).toBe('28.07%');
    expect(screen.getByText('Paid by insurer')).toBeTruthy();
    expect(screen.getByText('Room-rent deduction ₹24,600')).toBeTruthy();
    expect(screen.getByText('Non-payables ₹9,600')).toBeTruthy();
  });
});
