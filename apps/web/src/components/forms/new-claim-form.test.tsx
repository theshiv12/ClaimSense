// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NewClaimForm } from './new-claim-form';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/api/client', () => ({ createClaim: vi.fn() }));
afterEach(cleanup);

describe('NewClaimForm', () => {
  it('TC-UI-17 consent switches are switches, and the required one says so', () => {
    render(<NewClaimForm plans={[{ planId: 'p', name: 'Plan' }]} />);
    expect(screen.getAllByRole('switch')).toHaveLength(3);
    expect(screen.getByRole('switch', { name: /Read my documents to estimate this claim/ }).getAttribute('aria-required')).toBe('true');
  });
});
