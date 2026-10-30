// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExplainEstimate } from './explain-estimate';

afterEach(cleanup);

describe('ExplainEstimate', () => {
  it('TC-UI-EXPL-01 explains with citations; quota and guest messages', async () => {
    const explain = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, data: { refused: false, kind: 'answer', answer: 'Your policy will likely cover most of the bill.', citations: [{ id: 'S-VERDICT', label: 'Your estimate', kind: 'reason' }] } })
      .mockResolvedValueOnce({ ok: false, code: 'AI_QUOTA_EXCEEDED' })
      .mockResolvedValueOnce({ ok: false, code: 'AUTH_REQUIRED' });
    render(<ExplainEstimate claimId="c1" explain={explain} />);
    const button = screen.getByRole('button', { name: 'Explain my estimate in simple words' });
    await userEvent.click(button);
    expect(explain).toHaveBeenCalledWith({ claimId: 'c1' });
    expect(await screen.findByText(/likely cover most of the bill/)).toBeTruthy();
    expect(screen.getByText('Your estimate')).toBeTruthy();
    await userEvent.click(button);
    expect((await screen.findByRole('alert')).textContent).toMatch(/free AI limit/);
    await userEvent.click(button);
    expect(await screen.findByText(/Create an account to get an explanation/)).toBeTruthy();
  });
});
