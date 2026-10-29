// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import Home from './page';

afterEach(cleanup);

describe('Landing page', () => {
  it('TC-UI-15 the sample card shows engine output and the full disclaimer', async () => {
    const { container } = render(await Home({ searchParams: Promise.resolve({}) } as Parameters<typeof Home>[0]));
    const card = screen.getByRole('region', { name: 'Sample estimate' });
    // docs/rules-spec.md Case B: ₹2,05,800 payable.
    expect(card.textContent).toContain('₹2,05,800');
    expect(card.textContent).toContain('Estimate, not a guarantee. Only your insurer decides. Not medical or legal advice.');
    expect(container.textContent).not.toMatch(/approved|real rules/i);
  });
});
