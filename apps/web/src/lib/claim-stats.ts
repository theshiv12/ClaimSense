import type { Verdict } from '@claimsense/shared';

export interface ClaimListItem {
  id: string;
  treatment: string;
  relation: string;
  verdict: Verdict | null;
  payablePaise: number | null;
  claimedPaise: number | null;
  outOfPocketPaise: number | null;
}

export type ClaimFilter = Verdict | 'all';

export const claimStats = (_claims: ClaimListItem[]) => ({});
export const filterClaims = <T extends ClaimListItem>(claims: T[], _f: ClaimFilter, _q: string): T[] => claims.slice(0, 0);
