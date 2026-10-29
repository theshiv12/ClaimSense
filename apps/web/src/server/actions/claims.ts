'use server';
import 'server-only';
import { ClaimIdInputSchema, CreateClaimInputSchema } from '@claimsense/shared';
import { Types } from 'mongoose';
import { z } from 'zod';
import { fail, userAction } from '../action';
import { endSession } from '../auth';
import { claimExpiry } from '../expiry';
import { userFact } from '../facts';
import { Claim, EstimateModel, FactModel, Session, User } from '../models';
import { getPlan } from '../plans';
import { findClaim } from '../scope';

const createClaimAction = userAction('createClaim', CreateClaimInputSchema, async (user, input) => {
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
});

const deleteClaimAction = userAction('deleteClaim', ClaimIdInputSchema, async (user, { claimId }) => {
  const claim = await findClaim(user.id, claimId);
  if (!claim) return fail('NOT_FOUND');
  const filter = { userId: claim.userId, claimId: claim._id };
  await Promise.all([FactModel.deleteMany(filter), EstimateModel.deleteMany(filter)]);
  await Claim.deleteOne({ _id: claim._id, userId: claim.userId });
  return null;
});

/** "Delete my data": every row of this user, then the session. Nothing of anyone else. */
const deleteMeAction = userAction('deleteMe', z.unknown(), async (user) => {
  const userId = new Types.ObjectId(user.id);
  await Promise.all([
    FactModel.deleteMany({ userId }),
    EstimateModel.deleteMany({ userId }),
    Claim.deleteMany({ userId }),
  ]);
  await endSession();
  await Session.deleteMany({ userId });
  await User.deleteOne({ _id: userId });
  return null;
});

// 'use server' files may export only async functions.
export async function createClaim(input?: unknown) {
  return createClaimAction(input);
}
export async function deleteClaim(input?: unknown) {
  return deleteClaimAction(input);
}
export async function deleteMe(input?: unknown) {
  return deleteMeAction(input);
}
