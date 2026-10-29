import { describe, expect, it } from 'vitest';
import { claimStats, filterClaims, type ClaimListItem } from './claim-stats';

const claim = (patch: Partial<ClaimListItem>): ClaimListItem => ({
  id: 'x', treatment: 'Appendix surgery', relation: 'self', verdict: null, payablePaise: null, claimedPaise: null, outOfPocketPaise: null, ...patch,
});

const claims = [
  claim({ id: 'b', treatment: 'Knee replacement (right)', relation: 'parent', verdict: 'likely_partial', payablePaise: 20_580_000, claimedPaise: 24_000_000, outOfPocketPaise: 3_420_000 }),
  claim({ id: 'd', verdict: 'likely_payable', payablePaise: 8_800_000, claimedPaise: 8_800_000, outOfPocketPaise: 0 }),
  claim({ id: 'n' }),
];

describe('claimStats / filterClaims', () => {
  it('TC-UI-13 totals checked claims and filters by verdict and search', () => {
    // payout 20,580,000 + 8,800,000 = 29,380,000 paise (₹2,93,800); you may pay 3,420,000 + 0.
    expect(claimStats(claims)).toEqual({
      checks: 3, checked: 2, payablePaise: 29_380_000, outOfPocketPaise: 3_420_000,
      byVerdict: { likely_payable: 1, likely_partial: 1, at_risk: 0 },
    });
    expect(filterClaims(claims, 'likely_partial', '').map((c) => c.id)).toEqual(['b']);
    expect(filterClaims(claims, 'all', 'KNEE').map((c) => c.id)).toEqual(['b']);
    expect(filterClaims(claims, 'all', 'parent').map((c) => c.id)).toEqual(['b']);
    expect(filterClaims(claims, 'all', '').map((c) => c.id)).toEqual(['b', 'd', 'n']);
  });
});
