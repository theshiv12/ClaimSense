import { describe, it } from 'vitest';
import { BpsSchema, IsoDateSchema, PaiseSchema } from './primitives';
import { accepts, rejects } from './test-helpers';

describe('primitives', () => {
  it('TC-SH-01 money is integer paise, percentages are basis points, dates are real YYYY-MM-DD days', () => {
    accepts(PaiseSchema, 0);
    accepts(PaiseSchema, 24_000_000); // ₹2,40,000 × 100
    rejects(PaiseSchema, 1.5);
    rejects(PaiseSchema, -1);
    rejects(PaiseSchema, '100');

    accepts(BpsSchema, 0);
    accepts(BpsSchema, 2000); // 20%
    accepts(BpsSchema, 10_000); // 100%
    rejects(BpsSchema, -1);
    rejects(BpsSchema, 10_001);
    rejects(BpsSchema, 12.5);

    accepts(IsoDateSchema, '2026-11-18');
    accepts(IsoDateSchema, '2028-02-29'); // 2028 is a leap year
    rejects(IsoDateSchema, '2026-02-29'); // 2026 is not
    rejects(IsoDateSchema, '2026-11-18T00:00:00Z');
    rejects(IsoDateSchema, '18/11/2026');
  });
});
