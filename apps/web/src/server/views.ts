import 'server-only';
import { estimate as runEngine, isUsable, toClaimFacts } from '@claimsense/rules';
import { EstimateSchema, type Estimate, type Remedy } from '@claimsense/shared';
import type { StoredFactView } from '@/lib/fact-view';
import { EstimateModel } from './models';
import { getPlan, remedies } from './plans';
import { findClaim, latestEstimate, listClaims, listFacts } from './scope';

// Read paths for server components. Every call is owner-scoped through scope.ts (golden rule 5).

export const factsView = async (userId: string, claimId: string): Promise<StoredFactView[]> =>
  (await listFacts(userId, claimId)).map((f) => ({ ...f, usable: isUsable(f) }));

/** The estimate for the claim's current facts: the saved one if the facts have not changed, else a fresh run (saved). */
export const estimateView = async (userId: string, claimId: string) => {
  const claim = await findClaim(userId, claimId);
  if (!claim) return null;
  const plan = getPlan(claim.planId);
  if (!plan) return null;
  const saved = await latestEstimate(userId, claimId);
  const parsed = saved ? EstimateSchema.safeParse(saved.estimate) : null;
  let estimate: Estimate;
  if (parsed?.success && parsed.data.factsVersion === claim.factsVersion) estimate = parsed.data;
  else {
    estimate = runEngine(toClaimFacts(await listFacts(userId, claimId), claim.planId), plan, claim.factsVersion);
    await EstimateModel.create({ userId: claim.userId, claimId: claim._id, estimate, expiresAt: claim.expiresAt });
  }
  const forResults: Remedy[] = estimate.results.flatMap((r) =>
    r.outcome === 'pass' ? [] : remedies.remedies.filter((m) => m.ruleId === r.ruleId && m.outcome === r.outcome),
  );
  return { claim, plan, estimate, remedies: forResults };
};

export interface ClaimSummary {
  id: string;
  treatment: string;
  relation: string;
  createdAt: string;
  sampleCaseId: string | null;
  verdict: Estimate['verdict'] | null;
  payablePaise: number | null;
  claimedPaise: number | null;
}

export const claimSummaries = async (userId: string): Promise<ClaimSummary[]> => {
  const claims = await listClaims(userId);
  return Promise.all(
    claims.map(async (c) => {
      const e = await latestEstimate(userId, String(c._id));
      const parsed = e ? EstimateSchema.safeParse(e.estimate) : null;
      const est = parsed?.success ? parsed.data : null;
      return {
        id: String(c._id),
        treatment: c.subject?.treatment ?? '',
        relation: c.subject?.relation ?? '',
        createdAt: c.createdAt.toISOString().slice(0, 10),
        sampleCaseId: c.sampleCaseId ?? null,
        verdict: est?.verdict ?? null,
        payablePaise: est?.payablePaise ?? null,
        claimedPaise: est?.claimedPaise ?? null,
      };
    }),
  );
};
