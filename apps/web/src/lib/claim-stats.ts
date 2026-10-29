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

/** Totals for the My claims tiles (Figma 08). Only claims with an up-to-date estimate count towards money. */
export const claimStats = (claims: ClaimListItem[]) => {
  const byVerdict: Record<Verdict, number> = { likely_payable: 0, likely_partial: 0, at_risk: 0 };
  let checked = 0;
  let payablePaise = 0;
  let outOfPocketPaise = 0;
  for (const c of claims) {
    if (!c.verdict) continue;
    checked += 1;
    byVerdict[c.verdict] += 1;
    payablePaise += c.payablePaise ?? 0;
    outOfPocketPaise += c.outOfPocketPaise ?? 0;
  }
  return { checks: claims.length, checked, payablePaise, outOfPocketPaise, byVerdict };
};

export const filterClaims = <T extends ClaimListItem>(claims: T[], f: ClaimFilter, q: string): T[] => {
  const needle = q.trim().toLowerCase();
  return claims.filter(
    (c) => (f === 'all' || c.verdict === f) && (!needle || `${c.treatment} ${c.relation}`.toLowerCase().includes(needle)),
  );
};
