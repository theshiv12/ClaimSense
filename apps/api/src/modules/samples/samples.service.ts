import type { CurrentUserView } from '@claimsense/shared';
import mongoose, { type Types } from 'mongoose';
import { env } from '../../core/env';
import { fail } from '../../core/errors';
import { Claim, FactModel, User } from '../../core/models';
import type { SessionPort } from '../../core/session';
import { SAMPLES } from '../../lib/samples';
import { guestTtlMs, takeSampleStart } from '../auth/auth.service';
import { factsFromClaimFacts } from '../facts/fact-builders';

/** A guest session with one sample claim, preloaded with its synthetic facts. */
export const startSample = async (caseId: keyof typeof SAMPLES, existing: CurrentUserView | null, ip: string, session: SessionPort) => {
  const sample = SAMPLES[caseId];
  let userId: Types.ObjectId;
  let expiresAt: Date;
  if (existing) {
    // Reuse whoever is signed in: one guest per browser, and a signed-in user is never logged out.
    userId = new mongoose.Types.ObjectId(existing.id);
    const doc = await User.findById(userId, { expiresAt: 1 }).lean();
    expiresAt = doc?.expiresAt ?? new Date(Date.now() + env().CLAIM_TTL_DAYS * 24 * 60 * 60 * 1000);
  } else {
    if (!(await takeSampleStart(ip))) return fail('RATE_LIMITED');
    expiresAt = new Date(Date.now() + guestTtlMs());
    userId = (await User.create({ isGuest: true, adultAttested: false, expiresAt }))._id;
    await session.start(userId, guestTtlMs());
  }
  const claim = await Claim.create({
    userId,
    planId: sample.facts.planId,
    subject: { relation: sample.relation, treatment: sample.treatment },
    consent: { analysis: true, retention: false, improve: false },
    sampleCaseId: caseId,
    factsVersion: 1,
    expiresAt,
  });
  await FactModel.insertMany(factsFromClaimFacts(sample.facts).map((f) => ({ ...f, userId, claimId: claim._id, expiresAt })));
  return { claimId: String(claim._id) };
};
