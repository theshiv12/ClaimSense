import type { ClaimSummary, ClaimView, CreateClaimInput, CurrentUserView } from '@claimsense/shared';
import { EstimateSchema } from '@claimsense/shared';
import { Types } from 'mongoose';
import { fail } from '../../core/errors';
import { Claim, EstimateModel, ExtractionUsage, FactModel, Session, User } from '../../core/models';
import { findClaim, latestEstimate, listClaims } from '../../core/scope';
import type { SessionPort } from '../../core/session';
import { claimExpiry } from '../../lib/expiry';
import { getPlan } from '../../lib/plans';
import { userFact } from '../facts/fact-builders';

export const createClaim = async (user: CurrentUserView, input: CreateClaimInput) => {
  if (!getPlan(input.planId)) return fail('PLAN_NOT_FOUND');
  const userId = new Types.ObjectId(user.id);
  const expiresAt = await claimExpiry(user);
  const facts = [
    ...(input.admissionDate ? [userFact('admission_date', input.admissionDate)] : []),
    ...(input.room ? [userFact('room_category', input.room.category), userFact('room_rent_per_day', input.room.rentPerDayPaise)] : []),
  ];
  const claim = await Claim.create({
    userId,
    planId: input.planId,
    subject: input.subject,
    consent: input.consent,
    factsVersion: 0,
    expiresAt,
  });
  await FactModel.insertMany(facts.map((f) => ({ ...f, userId, claimId: claim._id, expiresAt })));
  return { claimId: String(claim._id) };
};

/** One claim, owner-scoped (golden rule 5): a foreign or malformed id is NOT_FOUND. */
export const getClaim = async (userId: string, claimId: string): Promise<ClaimView> => {
  const c = (await findClaim(userId, claimId)) ?? fail('NOT_FOUND');
  return { id: String(c._id), planId: c.planId, relation: c.subject?.relation ?? '', treatment: c.subject?.treatment ?? '', sampleCaseId: c.sampleCaseId ?? null };
};

export const deleteClaim = async (userId: string, claimId: string) => {
  const claim = (await findClaim(userId, claimId)) ?? fail('NOT_FOUND');
  const filter = { userId: claim.userId, claimId: claim._id };
  await Promise.all([FactModel.deleteMany(filter), EstimateModel.deleteMany(filter)]);
  await Claim.deleteOne({ _id: claim._id, userId: claim.userId });
  return null;
};

/** "Delete my data": every row of this user, then the session. Nothing of anyone else. */
export const deleteMe = async (user: CurrentUserView, session: SessionPort) => {
  const userId = new Types.ObjectId(user.id);
  await Promise.all([
    FactModel.deleteMany({ userId }),
    EstimateModel.deleteMany({ userId }),
    Claim.deleteMany({ userId }),
    ExtractionUsage.deleteMany({ userId }),
  ]);
  await session.end();
  await Session.deleteMany({ userId });
  await User.deleteOne({ _id: userId });
  return null;
};

/** My claims (Figma 08). An estimate for older facts is out of date: the claim shows as not checked yet. */
export const claimSummaries = async (userId: string): Promise<ClaimSummary[]> => {
  const claims = await listClaims(userId);
  return Promise.all(
    claims.map(async (c) => {
      const e = await latestEstimate(userId, String(c._id));
      const parsed = e ? EstimateSchema.safeParse(e.estimate) : null;
      const est = parsed?.success && parsed.data.factsVersion === c.factsVersion ? parsed.data : null;
      const plan = getPlan(c.planId);
      return {
        id: String(c._id),
        treatment: c.subject?.treatment ?? '',
        relation: c.subject?.relation ?? '',
        createdAt: c.createdAt.toISOString().slice(0, 10),
        expiresAt: c.expiresAt.toISOString().slice(0, 10),
        sampleCaseId: c.sampleCaseId ?? null,
        planName: plan?.planName ?? c.planId,
        wordingVersion: plan?.wordingVersion ?? '',
        verdict: est?.verdict ?? null,
        payablePaise: est?.payablePaise ?? null,
        claimedPaise: est?.claimedPaise ?? null,
        outOfPocketPaise: est?.outOfPocketPaise ?? null,
      };
    }),
  );
};
