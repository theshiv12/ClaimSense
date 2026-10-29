'use server';
import 'server-only';
import { ClaimIdInputSchema, SimulateRoomInputSchema, type Estimate } from '@claimsense/shared';
import { estimate, simulateRoom as simulate, toClaimFacts } from '@claimsense/rules';
import { fail, userAction } from '../action';
import { EstimateModel } from '../models';
import { getPlan } from '../plans';
import { findClaim, listFacts } from '../scope';

const loadClaimFacts = async (userId: string, claimId: string) => {
  const claim = await findClaim(userId, claimId);
  if (!claim) return fail('NOT_FOUND');
  const plan = getPlan(claim.planId);
  if (!plan) return fail('PLAN_NOT_FOUND');
  const facts = toClaimFacts(await listFacts(userId, claimId), claim.planId);
  return { claim, plan, facts };
};

/** Runs the rules engine on the usable facts and saves the estimate (the model never decides money). */
const runCheckAction = userAction('runCheck', ClaimIdInputSchema, async (user, { claimId }) => {
  const { claim, plan, facts } = await loadClaimFacts(user.id, claimId);
  const result: Estimate = estimate(facts, plan, claim.factsVersion);
  await EstimateModel.create({ userId: claim.userId, claimId: claim._id, estimate: result, expiresAt: claim.expiresAt });
  return { estimate: result };
});

/** Room what-if: same facts, a different room. Not saved. */
const simulateRoomAction = userAction('simulateRoom', SimulateRoomInputSchema, async (user, { claimId, category, rentPerDayPaise }) => {
  const { claim, plan, facts } = await loadClaimFacts(user.id, claimId);
  return { estimate: simulate(facts, plan, { category, rentPerDayPaise }, claim.factsVersion) };
});

// 'use server' files may export only async functions.
export async function runCheck(input?: unknown) {
  return runCheckAction(input);
}
export async function simulateRoom(input?: unknown) {
  return simulateRoomAction(input);
}
