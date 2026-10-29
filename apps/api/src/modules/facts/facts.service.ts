import { isUsable } from '@claimsense/rules';
import type { BillHead, FactKey, FactValue, StoredFactView } from '@claimsense/shared';
import type { Types } from 'mongoose';
import { fail } from '../../core/errors';
import { Claim, FactModel } from '../../core/models';
import { findClaim, findFact, listFacts, toStoredFact } from '../../core/scope';
import { userFact, validValue } from './fact-builders';

const bumpVersion = (userId: Types.ObjectId, claimId: Types.ObjectId) => Claim.updateOne({ _id: claimId, userId }, { $inc: { factsVersion: 1 } });

/** The facts page: every fact with `usable` worked out by the engine's own rule. */
export const factsView = async (userId: string, claimId: string): Promise<StoredFactView[]> => {
  if (!(await findClaim(userId, claimId))) return fail('NOT_FOUND');
  return (await listFacts(userId, claimId)).map((f) => ({ ...f, usable: isUsable(f) }));
};

/** The user says an extracted fact is right: it becomes usable even if its quote did not verify. */
export const confirmFact = async (userId: string, claimId: string, factId: string) => {
  const fact = await findFact(userId, claimId, factId);
  if (!fact || fact.value === null) return fail('NOT_FOUND');
  const updated = await FactModel.findOneAndUpdate({ _id: fact._id, userId: fact.userId }, { confirmedByUser: true }, { new: true }).lean();
  await bumpVersion(fact.userId, fact.claimId);
  return { fact: toStoredFact(updated!) };
};

/** The user corrects a fact. The quote is kept for reference; the value is now user-corrected. */
export const editFact = async (userId: string, claimId: string, factId: string, value: FactValue) => {
  const fact = await findFact(userId, claimId, factId);
  if (!fact) return fail('NOT_FOUND');
  if (!validValue(fact.key, fact.head, value)) return fail('VALIDATION_FAILED');
  const updated = await FactModel.findOneAndUpdate(
    { _id: fact._id, userId: fact.userId },
    { value, status: 'found', source: 'user-corrected', verification: 'none', confirmedByUser: true, documentId: fact.documentId },
    { new: true },
  ).lean();
  await bumpVersion(fact.userId, fact.claimId);
  return { fact: toStoredFact(updated!) };
};

/** A fact the user types in (manual entry, or when the free AI limit is used up). */
export const addFact = async (userId: string, claimId: string, key: FactKey, head: BillHead, value: FactValue) => {
  const claim = await findClaim(userId, claimId);
  if (!claim) return fail('NOT_FOUND');
  if (!validValue(key, head, value)) return fail('VALIDATION_FAILED');
  const doc = await FactModel.create({ ...userFact(key, value, head), userId: claim.userId, claimId: claim._id, expiresAt: claim.expiresAt });
  await bumpVersion(claim.userId, claim._id);
  return { fact: toStoredFact(doc.toObject()) };
};
