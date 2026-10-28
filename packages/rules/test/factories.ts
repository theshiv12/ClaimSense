import { readFileSync } from 'node:fs';
import { ClaimFactsSchema, type ClaimFacts, type ClauseRef, type PlanConfig } from '@claimsense/shared';

// Synthetic values only (docs/test-cases.md, plan T). Real plan values live in config/plans.
const ref = (clauseId: string): ClauseRef => ({
  clauseId,
  page: 1,
  quote: `Synthetic clause ${clauseId}, written for rule tests only.`,
  source: 'wording',
});

/** Plan T: the rules-spec starting values, so tests never depend on an unverified config. */
export const testPlan = (): PlanConfig => ({
  planId: 'test-plan',
  insurer: 'Test Insurer',
  planName: 'Test Plan',
  uin: 'TEST-UIN-001',
  wordingVersion: 'T.1',
  rulesAsOf: '2026-10-28',
  verifiedBy: 'test',
  initialWait: { days: 30, accidentExempt: true, clause: ref('T-2') },
  specificDiseaseWait: {
    months: 24,
    accidentExempt: true,
    clause: ref('T-3'),
    conditions: [
      { id: 'cataract', label: 'Cataract', icd10Prefixes: ['H25'], keywords: ['cataract'] },
      { id: 'joint-replacement', label: 'Joint replacement', icd10Prefixes: ['M17'], keywords: ['joint replacement'] },
    ],
  },
  pedWait: { months: 36, clause: ref('T-4') },
  moratorium: { months: 60, clause: ref('T-5') },
  roomRent: { kind: 'fixed_per_day', capPaise: 500_000, icuCapPaise: null, clause: ref('T-6') },
  proportionateDeduction: {
    applies: true,
    excludedHeads: ['implants', 'pharmacy', 'diagnostics'],
    headsVerified: true,
    clause: ref('T-6'),
  },
  nonPayableHeads: { heads: ['consumables'], clause: ref('T-NP') },
  coPay: { tiers: [{ minAgeAtEntry: 61, bps: 2000 }], clause: ref('T-7') },
  sumInsured: { optionsPaise: [30_000_000], clause: ref('T-8') },
});

/** First inception date `I` used across the rule tests. */
export const I = '2025-01-10';

/** Facts that pass every rule on plan T; each test overrides only what it checks. */
export const facts = (patch: Partial<ClaimFacts> = {}): ClaimFacts => ({
  planId: 'test-plan',
  policyStartDate: '2026-03-12',
  policyEndDate: '2027-03-11',
  firstInceptionDate: I,
  sumInsuredPaise: 30_000_000,
  sumInsuredUsedPaise: 0,
  ageAtEntry: 40,
  admissionDate: '2026-11-18',
  dischargeDate: '2026-11-19',
  diagnosis: 'Acute appendicitis',
  icd10: 'K35.8',
  isAccident: false,
  ped: { exists: false, condition: null, firstDiagnosedDate: null, disclosed: null },
  room: { category: 'shared', rentPerDayPaise: 400_000, days: 1 },
  bill: { totalPaise: 400_000, lineItems: [{ head: 'room', amountPaise: 400_000 }] },
  ...patch,
});

/** Loads fixtures/cases/<id>/<file>.json. */
export const fixture = (id: string, file: 'case' | 'expected'): unknown =>
  JSON.parse(readFileSync(new URL(`../../../fixtures/cases/${id}/${file}.json`, import.meta.url), 'utf8'));

/** A sample case's facts, with planId switched to plan T for engine and verdict tests. */
export const caseFacts = (id: 'A' | 'B' | 'C' | 'D', patch: Partial<ClaimFacts> = {}): ClaimFacts => ({
  ...ClaimFactsSchema.parse(fixture(id, 'case')),
  planId: 'test-plan',
  ...patch,
});
