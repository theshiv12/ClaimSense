import { randomUUID } from 'node:crypto';
import { FactSchema, LlmExtractionSchema, type Fact, type LlmFact } from '@claimsense/shared';
import { isUsable } from '@claimsense/rules';
import type { Types } from 'mongoose';
import { env } from '../../core/env';
import { fail } from '../../core/errors';
import { Claim, ExtractionUsage, FactModel } from '../../core/models';
import { findClaim, toStoredFact } from '../../core/scope';
import { getLlm, LlmError, type LlmMimeType } from '../../integrations/llm';
import { readPdfPages } from '../../integrations/pdf-text';
import { normalizeValue } from '../../lib/normalize';
import { valueInQuote, verifyQuote } from '../../lib/quote-verify';

const MAGIC: [LlmMimeType, number[]][] = [
  ['application/pdf', [0x25, 0x50, 0x44, 0x46, 0x2d]], // %PDF-
  ['image/jpeg', [0xff, 0xd8, 0xff]],
  ['image/png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
];
const sniff = (b: Uint8Array) => MAGIC.find(([, sig]) => sig.every((x, i) => b[i] === x))?.[0] ?? null;

// Text aimed at an AI inside a document is a red flag: every fact from it needs the user's check.
const INJECTION = /ignore (all |any )?(the )?(previous|prior|above|earlier) instructions|(system|developer) (note|prompt|message|instruction)s? (to|for) (the )?(ai|assistant|model)|disregard (all |your |the )?(rules|instructions)/i;

/** One counter per user per UTC day, bumped atomically before the model is called. */
const takeQuota = async (userId: Types.ObjectId) => {
  const day = new Date().toISOString().slice(0, 10);
  const doc = await ExtractionUsage.findOneAndUpdate(
    { userId, day },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) } },
    { upsert: true, returnDocument: 'after' },
  ).lean();
  const ok = (doc?.count ?? 1) <= env().AI_DAILY_EXTRACTIONS_PER_USER;
  const refund = () => ExtractionUsage.updateOne({ userId, day }, { $inc: { count: -1 } });
  if (!ok) await refund();
  return { ok, refund };
};

/** Reserves one of the claim's document slots atomically, so parallel uploads cannot pass the limit. */
const takeSlot = async (claimId: Types.ObjectId, userId: Types.ObjectId, max: number) => {
  const r = await Claim.updateOne({ _id: claimId, userId, documentCount: { $lt: max } }, { $inc: { documentCount: 1 } });
  return { ok: r.modifiedCount === 1, release: () => Claim.updateOne({ _id: claimId, userId }, { $inc: { documentCount: -1 } }) };
};

/** The quote must be on its page, and the value must be readable from the quote (golden rules 3–4). */
const verification = (f: LlmFact, value: Fact['value'], pages: string[] | null): Fact['verification'] => {
  const v = verifyQuote(f.sourceQuote, pages, f.page);
  return (v === 'exact' || v === 'fuzzy') && !valueInQuote(f.key, value, f.sourceQuote) ? 'none' : v;
};

const toFact = (f: LlmFact, documentId: string, pages: string[] | null, flagged: boolean): Fact => {
  const found = f.status === 'found';
  const value = found ? normalizeValue(f.key, f.valueText) : null;
  const hasRef = found && f.sourceQuote.trim() !== '' && f.page > 0 && (pages === null || f.page <= pages.length);
  const status = !found ? f.status : value === null || !hasRef ? 'illegible' : 'found';
  return {
    key: f.key,
    head: f.head,
    value,
    status,
    source: 'document',
    documentId,
    sourceQuote: found && f.sourceQuote.trim() ? f.sourceQuote.trim() : null,
    page: hasRef ? f.page : null,
    confidence: f.confidence,
    verification: status === 'found' && !flagged ? verification(f, value, pages) : 'none',
    confirmedByUser: false,
  };
};

/**
 * Read → extract → save facts → discard the bytes (golden rule 9). The file and its name are never
 * stored or logged; only ids and counts are.
 */
export const uploadAndExtract = async (userId: string, claimId: string, file: Uint8Array) => {
  const claim = await findClaim(userId, claimId);
  if (!claim) return fail('NOT_FOUND');
  const e = env();
  if (file.byteLength > e.MAX_UPLOAD_MB * 1024 * 1024) return fail('FILE_TOO_LARGE');
  const bytes = new Uint8Array(file);
  const mimeType = sniff(bytes);
  if (!mimeType) return fail('FILE_TYPE_NOT_ALLOWED');
  const slot = await takeSlot(claim._id, claim.userId, e.MAX_FILES_PER_CLAIM);
  if (!slot.ok) return fail('DOCUMENT_LIMIT_REACHED');
  let saved = false;
  try {
    const result = await extractAndSave(claim, bytes, mimeType);
    saved = true;
    return result;
  } finally {
    if (!saved) await slot.release();
  }
};

const extractAndSave = async (
  claim: { _id: Types.ObjectId; userId: Types.ObjectId; expiresAt: Date },
  bytes: Uint8Array,
  mimeType: LlmMimeType,
) => {
  const pages = mimeType === 'application/pdf' ? await readPdfPages(bytes) : null;
  const quota = await takeQuota(claim.userId);
  if (!quota.ok) return fail('AI_QUOTA_EXCEEDED');

  let raw: unknown;
  try {
    raw = await (await getLlm()).extract({ bytes, mimeType });
  } catch (err) {
    await quota.refund(); // the model did not run, so the user keeps the try
    return fail(err instanceof LlmError ? err.code : 'LLM_UNAVAILABLE');
  }
  const parsed = LlmExtractionSchema.safeParse(raw);
  if (!parsed.success) return fail('LLM_OUTPUT_INVALID');

  const flagged = pages !== null && INJECTION.test(pages.join('\n'));
  const documentId = randomUUID();
  const facts = parsed.data.facts.map((f) => FactSchema.safeParse(toFact(f, documentId, pages, flagged)));
  const valid = facts.flatMap((r) => (r.success ? [r.data] : []));
  const docs = await FactModel.insertMany(valid.map((f) => ({ ...f, userId: claim.userId, claimId: claim._id, expiresAt: claim.expiresAt })));
  await Claim.updateOne({ _id: claim._id, userId: claim.userId }, { $inc: { factsVersion: 1 } });

  const warnings = [
    ...(flagged ? ['DOCUMENT_HAS_INSTRUCTIONS'] : []),
    ...(valid.length < facts.length ? ['SOME_FACTS_DROPPED'] : []),
    ...(pages === null ? ['NO_TEXT_LAYER'] : []),
  ];
  console.info(`[extract] claim=${String(claim._id)} doc=${documentId} facts=${valid.length} dropped=${facts.length - valid.length}`);
  const stored = docs.map((d) => toStoredFact(d.toObject()));
  return {
    documentId,
    documentType: parsed.data.documentType,
    facts: stored,
    needsYou: stored.filter((f) => f.status === 'found' && !isUsable(f)).length,
    warnings,
  };
};
