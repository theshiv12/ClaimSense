import 'server-only';
import { estimate as runEngine, isUsable, toClaimFacts } from '@claimsense/rules';
import { EstimateSchema, type Estimate, type Remedy, type RuleId } from '@claimsense/shared';
import { evidenceFor, type EvidenceLine } from '@/lib/evidence';
import type { ClaimListItem } from '@/lib/claim-stats';
import type { StoredFactView } from '@/lib/fact-view';
import { EstimateModel } from './models';
import { getPlan, remedies } from './plans';
import { SAMPLES } from './samples';
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
  const facts = await listFacts(userId, claimId);
  const saved = await latestEstimate(userId, claimId);
  const parsed = saved ? EstimateSchema.safeParse(saved.estimate) : null;
  let estimate: Estimate;
  if (parsed?.success && parsed.data.factsVersion === claim.factsVersion) estimate = parsed.data;
  else {
    estimate = runEngine(toClaimFacts(facts, claim.planId), plan, claim.factsVersion);
    await EstimateModel.create({ userId: claim.userId, claimId: claim._id, estimate, expiresAt: claim.expiresAt });
  }
  const forResults: Remedy[] = estimate.results.flatMap((r) =>
    r.outcome === 'pass' ? [] : remedies.remedies.filter((m) => m.ruleId === r.ruleId && m.outcome === r.outcome),
  );
  // The document lines behind each check that did not pass (Figma 04 evidence panel).
  const evidence: Partial<Record<RuleId, EvidenceLine[]>> = {};
  for (const r of estimate.results) if (r.outcome !== 'pass') evidence[r.ruleId] = evidenceFor(r, facts);
  const needsYou = facts.filter((f) => f.status === 'found' && !isUsable(f)).length;
  return { claim, plan, estimate, remedies: forResults, evidence, needsYou };
};

export interface ClaimSummary extends ClaimListItem {
  createdAt: string;
  expiresAt: string;
  sampleCaseId: string | null;
  planName: string;
  wordingVersion: string;
}

export const claimSummaries = async (userId: string): Promise<ClaimSummary[]> => {
  const claims = await listClaims(userId);
  return Promise.all(
    claims.map(async (c) => {
      const e = await latestEstimate(userId, String(c._id));
      const parsed = e ? EstimateSchema.safeParse(e.estimate) : null;
      // An estimate for older facts is out of date: show the claim as not checked yet.
      const est = parsed?.success && parsed.data.factsVersion === c.factsVersion ? parsed.data : null;
      return {
        id: String(c._id),
        treatment: c.subject?.treatment ?? '',
        relation: c.subject?.relation ?? '',
        createdAt: c.createdAt.toISOString().slice(0, 10),
        expiresAt: c.expiresAt.toISOString().slice(0, 10),
        sampleCaseId: c.sampleCaseId ?? null,
        planName: getPlan(c.planId)?.planName ?? c.planId,
        wordingVersion: getPlan(c.planId)?.wordingVersion ?? '',
        verdict: est?.verdict ?? null,
        payablePaise: est?.payablePaise ?? null,
        claimedPaise: est?.claimedPaise ?? null,
        outOfPocketPaise: est?.outOfPocketPaise ?? null,
      };
    }),
  );
};

/** Sample B run through the engine, for the landing page card: the numbers are never typed in by hand. */
export const sampleEstimateView = () => {
  const plan = getPlan(SAMPLES.B.facts.planId);
  if (!plan) return null;
  const estimate = runEngine(SAMPLES.B.facts, plan, 0);
  return { estimate, room: estimate.results.find((r) => r.ruleId === 'R6') ?? null };
};
