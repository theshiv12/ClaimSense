// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { startSample } from '@/lib/api/client';
import { SampleButton } from './sample-button';

vi.mock('@/lib/api/client', () => ({ startSample: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('SampleButton', () => {
  it('TC-UI-18 goes where the API says', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    const cases = [
      [{ ok: true, data: { claimId: 'abc123' } }, '/claims/abc123'],
      [{ ok: false, code: 'RATE_LIMITED' }, '/?sample=busy'],
      [{ ok: false, code: 'INTERNAL_ERROR' }, '/'],
    ] as const;
    for (const [result, target] of cases) {
      vi.mocked(startSample).mockResolvedValueOnce(result);
      render(<SampleButton caseId="B">Open sample B</SampleButton>);
      await userEvent.click(screen.getByRole('button', { name: 'Open sample B' }));
      await waitFor(() => expect(assign).toHaveBeenLastCalledWith(target));
      cleanup();
    }
    expect(startSample).toHaveBeenCalledWith('B');
  });
});
