import { describe, expect, it } from 'vitest';
import { normalizeValue } from './normalize';

describe('normalizeValue', () => {
  it('TC-NORM-01 reads Indian date formats as YYYY-MM-DD', () => {
    expect(normalizeValue('first_inception_date', '12/03/2019')).toBe('2019-03-12');
    expect(normalizeValue('first_inception_date', '12-03-2019')).toBe('2019-03-12');
    expect(normalizeValue('admission_date', '18 Nov 2026')).toBe('2026-11-18');
    expect(normalizeValue('admission_date', '2026-11-18')).toBe('2026-11-18');
    expect(normalizeValue('admission_date', '31/02/2026')).toBeNull();
  });

  it('TC-NORM-02 reads rupee amounts as paise', () => {
    expect(normalizeValue('sum_insured', 'Rs. 3,00,000/-')).toBe(30_000_000);
    expect(normalizeValue('room_rent_per_day', '₹7,000')).toBe(700_000);
    expect(normalizeValue('bill_total', '2,40,000.50')).toBe(24_000_050);
    expect(normalizeValue('sum_insured', '3 lakh')).toBe(30_000_000);
    expect(normalizeValue('sum_insured', 'abc')).toBeNull();
  });

  it('TC-NORM-03 reads integers and yes/no', () => {
    expect(normalizeValue('age_at_entry', '52 years')).toBe(52);
    expect(normalizeValue('room_days', '5 days')).toBe(5);
    expect(normalizeValue('is_accident', 'No')).toBe(false);
    expect(normalizeValue('ped_exists', 'yes')).toBe(true);
    expect(normalizeValue('is_accident', 'maybe')).toBeNull();
  });

  it('TC-NORM-04 maps room descriptions to categories', () => {
    expect(normalizeValue('room_category', 'Single AC room')).toBe('single');
    expect(normalizeValue('room_category', 'Twin sharing')).toBe('shared');
    expect(normalizeValue('room_category', 'General ward')).toBe('general');
    expect(normalizeValue('room_category', 'ICU')).toBe('icu');
    expect(normalizeValue('room_category', 'Deluxe')).toBe('deluxe');
    expect(normalizeValue('diagnosis', '  Osteoarthritis, right knee ')).toBe('Osteoarthritis, right knee');
  });
});
