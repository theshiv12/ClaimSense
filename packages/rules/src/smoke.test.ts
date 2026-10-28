import { PaiseSchema } from '@claimsense/shared';
import { describe, expect, it } from 'vitest';
import { RULE_IDS } from './index';

describe('rules smoke', () => {
  it('TC-SMOKE-02 exposes R1..R8 in order and resolves @claimsense/shared', () => {
    expect(RULE_IDS).toEqual(['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8']);
    expect(PaiseSchema.parse(0)).toBe(0);
  });
});
