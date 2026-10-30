// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClarifierCard } from './clarifier-card';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(cleanup);

// docs/test-cases.md TC-UI-CLAR-*: FR-6, at most 2 questions, answers saved as user-stated facts.
describe('ClarifierCard', () => {
  it('TC-UI-CLAR-01 two questions, saved as facts', async () => {
    const add = vi.fn().mockResolvedValue({ ok: true, data: { fact: {} } });
    render(
      <ClarifierCard
        claimId="c1"
        clarifiers={[
          { key: 'admission_date', mode: 'ask', question: 'When is the planned admission?' },
          { key: 'ped_exists', mode: 'ask', question: 'Did this condition start before the policy was first taken?' },
        ]}
        add={add}
      />,
    );
    fireEvent.change(screen.getByLabelText('When is the planned admission?'), { target: { value: '2026-11-18' } });
    await userEvent.selectOptions(screen.getByLabelText('Did this condition start before the policy was first taken?'), 'yes');
    await userEvent.click(screen.getByRole('button', { name: 'Save answers' }));
    expect(add).toHaveBeenCalledWith({ claimId: 'c1', key: 'admission_date', head: 'none', value: '2026-11-18' });
    expect(add).toHaveBeenCalledWith({ claimId: 'c1', key: 'ped_exists', head: 'none', value: true });
  });

  it('TC-UI-CLAR-02 a pending document value is confirmed on the facts page', () => {
    render(<ClarifierCard claimId="c1" clarifiers={[{ key: 'admission_date', mode: 'confirm', question: 'When is the planned admission?' }]} add={vi.fn()} />);
    expect(screen.getByRole('link', { name: /Confirm it on the facts page/ }).getAttribute('href')).toBe('/claims/c1/facts');
    expect(screen.queryByLabelText('When is the planned admission?')).toBeNull();
  });
});
