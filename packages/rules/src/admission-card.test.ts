import { existsSync, readFileSync } from 'node:fs';
import { ClaimFactsSchema, PlanConfigSchema, RemediesCatalogSchema } from '@claimsense/shared';
import { describe, expect, it } from 'vitest';
import { fixture } from '../test/factories';
import { buildAdmissionCard } from './admission-card';
import { estimate } from './engine';

// docs/test-cases.md TC-CARD-*. Expected values are worked by hand there, never from the implementation.
const config = (path: string) => {
  const url = new URL(`../../../config/${path}`, import.meta.url);
  if (!existsSync(url)) throw new Error(`${path} missing`);
  return JSON.parse(readFileSync(url, 'utf8')) as unknown;
};
const plan = PlanConfigSchema.parse(config('plans/star-fho.json'));
const remedies = RemediesCatalogSchema.parse(config('remedies.json')).remedies;
const sample = (id: 'B' | 'C') => ClaimFactsSchema.parse(fixture(id, 'case'));
const cardFor = (facts: ReturnType<typeof sample>) => buildAdmissionCard(estimate(facts, plan, 0), plan, remedies);

describe('buildAdmissionCard', () => {
  it('TC-CARD-01 Case B: amounts and room advice from the engine', () => {
    const card = cardFor(sample('B'));
    expect(card.payablePaise).toBe(20_580_000); // ₹2,05,800
    expect(card.outOfPocketPaise).toBe(3_420_000); // ₹34,200
    // Cap ₹5,000/day; R6 cut = room 10,00,000 + associated 14,60,000 = 24,60,000 paise.
    expect(card.roomAdvice).toEqual({ capPerDayPaise: 500_000, savingPaise: 2_460_000 });
    expect(card.waitsEnd).toEqual([]);
  });

  it('TC-CARD-02 desk questions only from remedies of checks that did not pass, at most 5', () => {
    const e = estimate(sample('B'), plan, 0);
    const card = buildAdmissionCard(e, plan, remedies);
    const allowed = remedies
      .filter((m) => e.results.some((r) => r.outcome !== 'pass' && r.ruleId === m.ruleId && r.outcome === m.outcome))
      .map((m) => m.title);
    expect(card.deskQuestions.length).toBeGreaterThan(0);
    expect(card.deskQuestions.length).toBeLessThanOrEqual(5);
    for (const q of card.deskQuestions) expect(allowed).toContain(q);
    expect(card.deskQuestions).toContain("Choose a room within your policy's limit");
  });

  it('TC-CARD-03 Case C: the R3 wait ends 2027-06-01 (2025-06-01 + 24 months, inclusive)', () => {
    const card = cardFor(sample('C'));
    expect(card.waitsEnd).toContainEqual({ ruleId: 'R3', date: '2027-06-01', clauseId: plan.specificDiseaseWait.clause.clauseId });
    expect(card.roomAdvice.savingPaise).toBeNull();
  });

  it('TC-CARD-04 documents: schedule, estimate, one per missing fact', () => {
    const card = cardFor({ ...sample('B'), diagnosis: null, icd10: null });
    expect(card.documentsToCarry.slice(0, 2)).toEqual(['Policy schedule', 'Hospital estimate']);
    expect(card.documentsToCarry).toContain('A document showing: Diagnosis or procedure');
    expect(new Set(card.documentsToCarry).size).toBe(card.documentsToCarry.length);
  });
});
