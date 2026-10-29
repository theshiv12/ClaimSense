'use server';
import 'server-only';
import { AddFactInputSchema, EditFactInputSchema, FactIdInputSchema } from '@claimsense/shared';
import { fail, userAction } from '../action';
import { userFact, validValue } from '../facts';
import { Claim, FactModel } from '../models';
import { findClaim, findFact, toStoredFact } from '../scope';

const bumpVersion = (claimId: unknown) => Claim.updateOne({ _id: claimId }, { $inc: { factsVersion: 1 } });

/** The user says an extracted fact is right: it becomes usable even if its quote did not verify. */
const confirmFactAction = userAction('confirmFact', FactIdInputSchema, async (user, { claimId, factId }) => {
  const fact = await findFact(user.id, claimId, factId);
  if (!fact || fact.value === null) return fail('NOT_FOUND');
  const updated = await FactModel.findOneAndUpdate({ _id: fact._id, userId: fact.userId }, { confirmedByUser: true }, { new: true }).lean();
  await bumpVersion(fact.claimId);
  return { fact: toStoredFact(updated!) };
});

/** The user corrects a fact. The quote is kept for reference; the value is now user-corrected. */
const editFactAction = userAction('editFact', EditFactInputSchema, async (user, { claimId, factId, value }) => {
  const fact = await findFact(user.id, claimId, factId);
  if (!fact) return fail('NOT_FOUND');
  if (!validValue(fact.key, fact.head, value)) return fail('VALIDATION_FAILED');
  const updated = await FactModel.findOneAndUpdate(
    { _id: fact._id, userId: fact.userId },
    { value, status: 'found', source: 'user-corrected', verification: 'none', confirmedByUser: true, documentId: fact.documentId },
    { new: true },
  ).lean();
  await bumpVersion(fact.claimId);
  return { fact: toStoredFact(updated!) };
});

/** A fact the user types in (manual entry, or when the free AI limit is used up). */
const addFactAction = userAction('addFact', AddFactInputSchema, async (user, { claimId, key, head, value }) => {
  const claim = await findClaim(user.id, claimId);
  if (!claim) return fail('NOT_FOUND');
  if (!validValue(key, head, value)) return fail('VALIDATION_FAILED');
  const doc = await FactModel.create({ ...userFact(key, value, head), userId: claim.userId, claimId: claim._id, expiresAt: claim.expiresAt });
  await bumpVersion(claim._id);
  return { fact: toStoredFact(doc.toObject()) };
});

// 'use server' files may export only async functions.
export async function confirmFact(input?: unknown) {
  return confirmFactAction(input);
}
export async function editFact(input?: unknown) {
  return editFactAction(input);
}
export async function addFact(input?: unknown) {
  return addFactAction(input);
}
