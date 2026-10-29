import mongoose from 'mongoose';
import { toClaimFacts } from '@claimsense/rules';
import { afterEach, describe, expect, it } from 'vitest';
import { docFixture, FakeLlm, geminiFixture } from '../../test/fake-llm';
import { signUpAs } from '../../test/users';
import { createClaim } from './actions/claims';
import { uploadAndExtract } from './actions/extract';
import { LlmError, setLlmForTests } from './llm';
import { Claim, ExtractionUsage } from './models';
import { normalizeValue } from './normalize';
import { valueInQuote, verifyQuote } from './quote-verify';
import { listFacts } from './scope';

afterEach(() => setLlmForTests(null));

const form = (claimId: string, bytes: Uint8Array) => {
  const f = new FormData();
  f.set('claimId', claimId);
  f.set('file', new File([bytes.slice()], 'doc-SAMPLE.pdf', { type: 'application/pdf' }));
  return f;
};
const newClaim = async () => {
  const r = await createClaim({ planId: 'star-fho', subject: { relation: 'self', treatment: 'Test' }, consent: { analysis: true, retention: true, improve: false } });
  if (!r.ok) throw new Error(r.code);
  return r.data.claimId;
};

describe('Quote and value checks (review fixes)', () => {
  it('TC-QV-07 checks only the stated page', () => {
    const pages = ['Sum Insured (Rs.) 3,00,000', 'Other page text entirely'];
    expect(verifyQuote('Sum Insured (Rs.) 3,00,000', pages, 1)).toBe('exact');
    expect(verifyQuote('Sum Insured (Rs.) 3,00,000', pages, 2)).toBe('none');
    expect(verifyQuote('Sum Insured (Rs.) 3,00,000', pages, 3)).toBe('none');
  });

  it('TC-QV-08 never accepts swapped numbers or a dropped negation as fuzzy', () => {
    const pages = ['Policy Period From 12/03/2026 To 11/03/2027 and this treatment is not covered under the policy'];
    expect(verifyQuote('Policy Period From 03/12/2026 To 11/03/2027', pages, 1)).toBe('none');
    expect(verifyQuote('this treatment is covered under the policy', pages, 1)).toBe('none');
  });

  it('TC-QV-09 needs the value to appear in its quote', () => {
    expect(valueInQuote('sum_insured', 990_000_000, 'Sum Insured (Rs.) 3,00,000')).toBe(false);
    expect(valueInQuote('sum_insured', 30_000_000, 'Sum Insured (Rs.) 3,00,000')).toBe(true);
    expect(valueInQuote('sum_insured', 30_000_000, 'Sum Insured: 3 lakhs')).toBe(true);
    expect(valueInQuote('first_inception_date', '2019-03-12', 'Date of first inception 12/03/2019')).toBe(true);
    expect(valueInQuote('first_inception_date', '2019-12-03', 'Date of first inception 12/03/2019')).toBe(false);
    expect(valueInQuote('room_days', 5, 'expected stay 5 days')).toBe(true);
    expect(valueInQuote('room_days', 6, 'expected stay 5 days')).toBe(false);
    expect(valueInQuote('room_category', 'single', 'Room category Single AC room')).toBe(true);
    expect(valueInQuote('room_category', 'suite', 'Room category Single AC room')).toBe(false);
    expect(valueInQuote('diagnosis', 'Osteoarthritis, right knee', 'Diagnosis Osteoarthritis, right knee (2021)')).toBe(true);
    expect(valueInQuote('diagnosis', 'Cancer', 'Diagnosis Osteoarthritis, right knee')).toBe(false);
    expect(valueInQuote('is_accident', false, 'Accident related No')).toBe(true);
  });

  it('TC-NORM-05 reads Indian spellings and rejects malformed dates', () => {
    expect(normalizeValue('sum_insured', '3 Lakhs')).toBe(30_000_000);
    expect(normalizeValue('sum_insured', '2 lacs')).toBe(20_000_000);
    expect(normalizeValue('sum_insured', '1.5 crores')).toBe(1_500_000_000);
    expect(normalizeValue('room_category', 'Semi-private room')).toBe('shared');
    expect(normalizeValue('first_inception_date', '112/03/2019')).toBeNull();
  });
});

describe('uploadAndExtract (review fixes)', () => {
  it('TC-EXT-11 the document limit holds for parallel uploads', async () => {
    await signUpAs();
    const claimId = await newClaim();
    await Claim.updateOne({ _id: claimId }, { documentCount: 7 });
    setLlmForTests(new FakeLlm([geminiFixture('case-b-schedule'), geminiFixture('case-b-schedule')]));
    const bytes = docFixture('caseB-schedule-SAMPLE.pdf');
    const results = await Promise.all([uploadAndExtract(form(claimId, bytes)), uploadAndExtract(form(claimId, bytes))]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results).toContainEqual({ ok: false, code: 'DOCUMENT_LIMIT_REACHED' });
    expect((await Claim.findById(claimId).lean())!.documentCount).toBe(8);
  });

  it('TC-EXT-12 a real quote with a different value is not verified', async () => {
    await signUpAs();
    const claimId = await newClaim();
    setLlmForTests(new FakeLlm([{ documentType: 'policy_schedule', facts: [{ key: 'sum_insured', head: 'none', valueText: '99,00,00,000', status: 'found', sourceQuote: 'Sum Insured (Rs.) 3,00,000', page: 1, confidence: 'high' }] }]));
    expect((await uploadAndExtract(form(claimId, docFixture('caseB-schedule-SAMPLE.pdf')))).ok).toBe(true);
    const userId = String((await Claim.findById(claimId).lean())!.userId);
    const facts = await listFacts(userId, claimId);
    // ₹99,00,00,000 = 990000000 rupees × 100 = 99000000000 paise.
    expect(facts[0]).toMatchObject({ value: 99_000_000_000, verification: 'none' });
    expect(toClaimFacts(facts, 'star-fho').sumInsuredPaise).toBeNull();
  });

  it('TC-EXT-13 a failed model call gives back the document slot and the quota', async () => {
    await signUpAs();
    const claimId = await newClaim();
    setLlmForTests(new FakeLlm([new LlmError('LLM_UNAVAILABLE')]));
    expect(await uploadAndExtract(form(claimId, docFixture('caseB-schedule-SAMPLE.pdf')))).toEqual({ ok: false, code: 'LLM_UNAVAILABLE' });
    const claim = (await Claim.findById(claimId).lean())!;
    expect(claim.documentCount).toBe(0);
    const usage = await ExtractionUsage.findOne({ userId: new mongoose.Types.ObjectId(String(claim.userId)) }).lean();
    expect(usage?.count ?? 0).toBe(0);
  });
});
