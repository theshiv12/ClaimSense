// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { StepBar } from './step-bar';

afterEach(cleanup);

describe('StepBar', () => {
  it('TC-UI-10 shows where you are, with a word and not colour alone', () => {
    render(<StepBar current="facts" />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(4);
    ['Set up', 'Upload', 'Confirm facts', 'Estimate'].forEach((label, i) => expect(items[i]?.textContent).toContain(label));
    expect(screen.getAllByText('done')).toHaveLength(2);
    expect(screen.getByText('Confirm facts').closest('[aria-current]')?.getAttribute('aria-current')).toBe('step');
  });
});

describe('StepBar pending facts', () => {
  it('TC-UI-10b does not call facts confirmed while some still need you', () => {
    render(<StepBar current="estimate" pendingFacts={2} />);
    expect(screen.getAllByText('done')).toHaveLength(2);
    expect(screen.getByText('2 to confirm')).toBeTruthy();
  });
});
