import { describe, expect, it } from 'vitest';
import { caseFacts, testPlan } from '../test/factories';
import { simulateRoom } from './simulate-room';

// docs/rules-spec.md "Room simulator, twin sharing at ₹4,500/day": associated charges unchanged.
const plan = testPlan();

describe('simulateRoom', () => {
  it('TC-SIM-01 twin sharing at ₹4,500/day on Case B', () => {
    // Room 450000 × 5 = 2250000 ≤ cap: no R6. Bill 24000000 − 3500000 + 2250000 = 22750000.
    // Payable 22750000 − 960000 (consumables) = 21790000. Out of pocket 960000.
    const e = simulateRoom(caseFacts('B'), plan, { category: 'shared', rentPerDayPaise: 450_000 }, 1);
    expect(e.claimedPaise).toBe(22_750_000);
    expect(e.payablePaise).toBe(21_790_000);
    expect(e.outOfPocketPaise).toBe(960_000);
    expect(e.results.find((r) => r.ruleId === 'R6')?.deductionPaise).toBe(0);
  });

  it('TC-SIM-02 does not change the facts it was given', () => {
    const f = caseFacts('B');
    const before = structuredClone(f);
    simulateRoom(f, plan, { category: 'shared', rentPerDayPaise: 450_000 }, 1);
    expect(f).toEqual(before);
  });

  it('TC-SIM-03 is likely_partial with R6 unknown when room days are unknown', () => {
    const b = caseFacts('B');
    const e = simulateRoom({ ...b, room: { ...b.room, days: null } }, plan, { category: 'shared', rentPerDayPaise: 450_000 }, 1);
    expect(e.results.find((r) => r.ruleId === 'R6')?.outcome).toBe('unknown');
    expect(e.verdict).toBe('likely_partial');
  });
});
