import 'server-only';
import { FactSchema, type Fact } from '@claimsense/shared';
import { isValidObjectId, Types } from 'mongoose';
import { connectDb } from './db';
import { Claim, EstimateModel, FactModel } from './models';

// Owner-scoped finders (CLAUDE.md golden rule 5): userId is always in the filter. A malformed or
// foreign id gives null, which the caller turns into NOT_FOUND / notFound().

const oid = (id: string): Types.ObjectId | null =>
  typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id) && isValidObjectId(id) ? new Types.ObjectId(id) : null;

export const findClaim = async (userId: string, claimId: string) => {
  const u = oid(userId);
  const c = oid(claimId);
  if (!u || !c) return null;
  await connectDb();
  return Claim.findOne({ _id: c, userId: u }).lean();
};

export type ClaimDoc = NonNullable<Awaited<ReturnType<typeof findClaim>>>;

export const listClaims = async (userId: string) => {
  const u = oid(userId);
  if (!u) return [];
  await connectDb();
  return Claim.find({ userId: u }).sort({ createdAt: -1 }).lean();
};

export interface StoredFact extends Fact {
  id: string;
}

/** A stored fact, re-validated on the way out (golden rule 4: Zod at every boundary). */
export const toStoredFact = (doc: { _id: unknown } & Record<string, unknown>): StoredFact => ({
  id: String(doc._id),
  ...FactSchema.parse({ ...doc, value: doc.value ?? null }),
});

export const listFacts = async (userId: string, claimId: string): Promise<StoredFact[]> => {
  const u = oid(userId);
  const c = oid(claimId);
  if (!u || !c) return [];
  await connectDb();
  const docs = await FactModel.find({ userId: u, claimId: c }).sort({ _id: 1 }).lean();
  return docs.map(toStoredFact);
};

export const findFact = async (userId: string, claimId: string, factId: string) => {
  const u = oid(userId);
  const c = oid(claimId);
  const f = oid(factId);
  if (!u || !c || !f) return null;
  await connectDb();
  return FactModel.findOne({ _id: f, userId: u, claimId: c }).lean();
};

export const latestEstimate = async (userId: string, claimId: string) => {
  const u = oid(userId);
  const c = oid(claimId);
  if (!u || !c) return null;
  await connectDb();
  return EstimateModel.findOne({ userId: u, claimId: c }).sort({ createdAt: -1 }).lean();
};
