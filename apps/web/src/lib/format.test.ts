import { describe, expect, it } from 'vitest';
import { formatInr } from './format';

describe('formatInr', () => {
  it('TC-UI-01 groups rupees the Indian way and drops zero paise', () => {
    expect(formatInr(20_580_000)).toBe('₹2,05,800');
    expect(formatInr(24_000_000)).toBe('₹2,40,000');
    expect(formatInr(960_000)).toBe('₹9,600');
    expect(formatInr(20_579_999)).toBe('₹2,05,799.99');
    expect(formatInr(0)).toBe('₹0');
  });
});
