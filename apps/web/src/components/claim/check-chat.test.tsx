// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CheckChat } from './check-chat';

afterEach(cleanup);

// docs/test-cases.md TC-UI-CHAT-*. The answer and citations come from the API (grounded on the check's sources).
const reply = {
  refused: false,
  answer: 'Your room is over the limit in clause 2(A).\n\nEstimate, not a guarantee. Only your insurer decides. Not medical or legal advice.',
  citations: [
    { id: 'S-CLAUSE', label: 'Clause 2(A), page 5', kind: 'clause' },
    { id: 'S-REM-r6-deduction-room', label: "Choose a room within your policy's limit", kind: 'remedy' },
  ],
};

describe('CheckChat', () => {
  it('TC-UI-CHAT-01 asks a suggested question and shows the cited sources', async () => {
    const ask = vi.fn().mockResolvedValue({ ok: true, data: reply });
    render(<CheckChat claimId="c1" ruleId="R6" outcome="deduction" ask={ask} />);
    expect(screen.getByText(/sent to Google Gemini/)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Why was this cut?' }));
    expect(ask).toHaveBeenCalledWith({ claimId: 'c1', ruleId: 'R6', question: 'Why was this cut?', history: [] });
    expect(await screen.findByText(/Your room is over the limit in clause 2\(A\)/)).toBeTruthy();
    expect(screen.getByText('Clause 2(A), page 5')).toBeTruthy();
    expect(screen.getByText("Choose a room within your policy's limit")).toBeTruthy();
  });

  it('TC-UI-CHAT-02 quota and guest messages', async () => {
    const ask = vi.fn().mockResolvedValueOnce({ ok: false, code: 'AI_QUOTA_EXCEEDED' }).mockResolvedValueOnce({ ok: false, code: 'AUTH_REQUIRED' });
    render(<CheckChat claimId="c1" ruleId="R6" outcome="deduction" ask={ask} />);
    await userEvent.type(screen.getByLabelText('Ask about this check'), 'Why?');
    await userEvent.click(screen.getByRole('button', { name: 'Ask' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/free AI limit/);
    await userEvent.type(screen.getByLabelText('Ask about this check'), 'Why?');
    await userEvent.click(screen.getByRole('button', { name: 'Ask' }));
    expect(await screen.findByText(/Create an account to ask about your own checks/)).toBeTruthy();
  });

  it('TC-UI-CHAT-03 honest and accessible: no similar-cases chip without cases, status region, roles, consent', async () => {
    const ask = vi.fn().mockResolvedValue({ ok: true, data: reply });
    render(<CheckChat claimId="c1" ruleId="R6" outcome="deduction" hasCases={false} ask={ask} />);
    expect(screen.queryByRole('button', { name: 'What happened in similar cases?' })).toBeNull();
    expect(screen.getByRole('status')).toBeTruthy(); // present before the first answer, so it is announced
    expect(screen.getByText(/lines quoted from your documents/)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Why was this cut?' }));
    expect(await screen.findByText('You asked:')).toBeTruthy();
    expect(screen.getByText('Answer:')).toBeTruthy();
  });

  it('TC-UI-CHAT-04 what-if answers are labelled', async () => {
    const ask = vi.fn().mockResolvedValue({ ok: true, data: { refused: false, kind: 'whatif', answer: 'What if it was an accident: No change.', citations: [] } });
    render(<CheckChat claimId="c1" ruleId="R6" outcome="deduction" ask={ask} />);
    await userEvent.click(screen.getByRole('button', { name: 'Why was this cut?' }));
    expect(await screen.findByText('What-if (not saved)')).toBeTruthy();
  });
});

