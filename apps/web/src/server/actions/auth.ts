'use server';
import 'server-only';
import { LoginInputSchema, SignupInputSchema, StartSampleInputSchema } from '@claimsense/shared';
import type { Types } from 'mongoose';
import { z } from 'zod';
import { fail, publicAction } from '../action';
import {
  endSession, guestTtlMs, hashPassword, loginRateLimited, recordLoginFailure, sessionTtlMs, startSession, verifyPassword,
} from '../auth';
import { factsFromClaimFacts } from '../facts';
import { Claim, FactModel, User } from '../models';
import { SAMPLES } from '../samples';

const signupAction = publicAction('signup', SignupInputSchema, async (input) => {
  if (await User.exists({ email: input.email })) return fail('EMAIL_TAKEN');
  const passwordHash = await hashPassword(input.password);
  let userId: Types.ObjectId;
  try {
    ({ _id: userId } = await User.create({ email: input.email, passwordHash, displayName: input.displayName, adultAttested: true, isGuest: false }));
  } catch (err) {
    // A concurrent signup with the same email hits the unique index.
    if (err instanceof Error && 'code' in err && err.code === 11000) return fail('EMAIL_TAKEN');
    throw err;
  }
  await startSession(userId, sessionTtlMs());
  return null;
});

// Unknown email and wrong password give the same AUTH_INVALID (docs/api.md).
const loginAction = publicAction('login', LoginInputSchema, async ({ email, password }) => {
  if (await loginRateLimited(email)) return fail('RATE_LIMITED');
  const user = await User.findOne({ email, isGuest: false }).lean();
  const ok = user?.passwordHash ? await verifyPassword(user.passwordHash, password) : false;
  if (!user || !ok) {
    await recordLoginFailure(email);
    return fail('AUTH_INVALID');
  }
  await startSession(user._id, sessionTtlMs());
  return null;
});

const logoutAction = publicAction('logout', z.unknown(), async () => {
  await endSession();
  return null;
});

/** A guest session with one sample claim, preloaded with its synthetic facts. */
const startSampleAction = publicAction('startSample', StartSampleInputSchema, async ({ caseId }) => {
  const sample = SAMPLES[caseId];
  const expiresAt = new Date(Date.now() + guestTtlMs());
  const user = await User.create({ isGuest: true, adultAttested: false, expiresAt });
  await startSession(user._id, guestTtlMs());
  const claim = await Claim.create({
    userId: user._id,
    planId: sample.facts.planId,
    subject: { relation: sample.relation, treatment: sample.treatment },
    consent: { analysis: true, retention: false, improve: false },
    sampleCaseId: caseId,
    factsVersion: 1,
    expiresAt,
  });
  await FactModel.insertMany(factsFromClaimFacts(sample.facts).map((f) => ({ ...f, userId: user._id, claimId: claim._id, expiresAt })));
  return { claimId: String(claim._id) };
});

// 'use server' files may export only async functions.
export async function signup(input?: unknown) {
  return signupAction(input);
}
export async function login(input?: unknown) {
  return loginAction(input);
}
export async function logout(input?: unknown) {
  return logoutAction(input);
}
export async function startSample(input?: unknown) {
  return startSampleAction(input);
}
