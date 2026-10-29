import 'server-only';
import { estimate as runEngine, isUsable, toClaimFacts } from '@claimsense/rules';
import { EstimateSchema, type Estimate, type Remedy, type RuleId } from '@claimsense/shared';
import type { EvidenceLine } from '@/components/claim/evidence-panel';
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
  // The document lines behind each check that did not pass (Figma 04 evidence panel). Bill lines: the room only.
  const evidence: Partial<Record<RuleId, EvidenceLine[]>> = {};
  for (const r of estimate.results) {
    if (r.outcome === 'pass') continue;
    evidence[r.ruleId] = facts
      .filter((f) => r.usedFacts.includes(f.key) && f.source === 'document' && f.sourceQuote)
      .filter((f) => f.key !== 'bill_line_item' || f.head === 'room' || f.head === 'icu')
      .map((f) => ({ key: f.key, quote: f.sourceQuote ?? '', page: f.page, usable: isUsable(f) }));
  }
  return { claim, plan, estimate, remedies: forResults, evidence };
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
      // An estimate for older facts is out of date: show the claim as not checked yet.
      const est = parsed?.success && parsed.data.factsVersion === c.factsVersion ? parsed.data : null;
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
