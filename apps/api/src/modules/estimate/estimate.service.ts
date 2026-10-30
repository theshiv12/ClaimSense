import { estimate as runEngine, isUsable, pickClarifiers, simulateRoom as simulate, toClaimFacts } from '@claimsense/rules';
import { CLARIFIER_QUESTIONS, EstimateSchema, FACT_LABELS, type Estimate, type EstimateView, type EvidenceLine, type Precedent, type Remedy, type RoomCategory, type RuleId } from '@claimsense/shared';
import { fail } from '../../core/errors';
import { EstimateModel } from '../../core/models';
import { findClaim, latestEstimate, listFacts } from '../../core/scope';
import { evidenceFor } from '../../lib/evidence';
import { getPlan, remedies } from '../../lib/plans';
import { matchPrecedents, precedents as reviewedCases } from '../../lib/precedents';
import { pendingDocumentKeys } from './pending';

const loadClaim = async (userId: string, claimId: string) => {
  const claim = (await findClaim(userId, claimId)) ?? fail('NOT_FOUND');
  const plan = getPlan(claim.planId) ?? fail('PLAN_NOT_FOUND');
  return { claim, plan };
};

/** Runs the rules engine on the usable facts and saves the estimate (the model never decides money). */
export const runCheck = async (userId: string, claimId: string) => {
  const { claim, plan } = await loadClaim(userId, claimId);
  const result: Estimate = runEngine(toClaimFacts(await listFacts(userId, claimId), claim.planId), plan, claim.factsVersion);
  await EstimateModel.create({ userId: claim.userId, claimId: claim._id, estimate: result, expiresAt: claim.expiresAt });
  return { estimate: result };
};

/** Room what-if: same facts, a different room. Not saved. */
export const simulateRoom = async (userId: string, claimId: string, category: RoomCategory, rentPerDayPaise: number) => {
  const { claim, plan } = await loadClaim(userId, claimId);
  const facts = toClaimFacts(await listFacts(userId, claimId), claim.planId);
  return { estimate: simulate(facts, plan, { category, rentPerDayPaise }, claim.factsVersion) };
};

/** The estimate page: the saved estimate if the facts have not changed, else a fresh run (saved). */
export const estimateView = async (userId: string, claimId: string): Promise<EstimateView> => {
  const { claim, plan } = await loadClaim(userId, claimId);
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
  // Reviewed public decisions on the same rule and outcome (ADR-010).
  const precedents: Partial<Record<RuleId, Precedent[]>> = {};
  for (const r of estimate.results) {
    if (r.outcome === 'pass') continue;
    evidence[r.ruleId] = evidenceFor(r, facts);
    precedents[r.ruleId] = matchPrecedents(reviewedCases, plan.insurer, r);
  }
  return {
    claim: {
      id: String(claim._id),
      planId: claim.planId,
      relation: claim.subject?.relation ?? '',
      treatment: claim.subject?.treatment ?? '',
      sampleCaseId: claim.sampleCaseId ?? null,
    },
    plan: { planName: plan.planName, wordingVersion: plan.wordingVersion, uin: plan.uin, rulesAsOf: plan.rulesAsOf },
    estimate,
    remedies: forResults,
    evidence,
    precedents,
    // FR-6: at most 2 questions; a key any document has a value for is confirmed on the facts page, never asked.
    clarifiers: pickClarifiers(estimate.results, pendingDocumentKeys(facts)).map((c) => ({
      ...c,
      question: CLARIFIER_QUESTIONS[c.key] ?? FACT_LABELS[c.key],
    })),
    needsYou: facts.filter((f) => f.status === 'found' && !isUsable(f)).length,
  };
};
