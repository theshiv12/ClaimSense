import { describe, expect, it } from 'vitest';
import { PaiseSchema } from './index';

describe('shared smoke', () => {
  it('TC-SMOKE-01 PaiseSchema accepts integer paise and rejects fractions and negatives', () => {
    expect(PaiseSchema.parse(100)).toBe(100);
    expect(PaiseSchema.safeParse(1.5).success).toBe(false);
    expect(PaiseSchema.safeParse(-1).success).toBe(false);
  });
});
