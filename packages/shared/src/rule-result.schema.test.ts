import { describe, it } from 'vitest';
import { ErrorCode } from './errors';
import { EstimateSchema, RuleResultSchema } from './rule-result.schema';
import { accepts, rejects } from './test-helpers';

const passed = (ruleId: string) => ({
  ruleId,
  outcome: 'pass',
  applicable: true,
  reasonCode: `${ruleId}_PASS`,
  deductionPaise: 0,
  clause: null,
  usedFacts: [],
  missingFacts: [],
  params: {},
});

const r6CaseB = {
  ...passed('R6'),
  outcome: 'deduction',
  reasonCode: 'R6_ROOM_OVER_CAP',
  deductionPaise: 2_460_000, // room 10,000 + associated 14,600 = ₹24,600
  usedFacts: ['room_rent_per_day', 'room_days', 'bill_line_item'],
  params: { capPaise: 500_000, rentPerDayPaise: 700_000 },
};

// Case B, docs/rules-spec.md (paise):
//   claimed 24,000,000; non-payables (consumables) 960,000 → running 23,040,000
//   R6 −2,460,000 → 20,580,000; R7 none (age 52 < 61); R8 none (20,580,000 ≤ 30,000,000)
//   out of pocket 24,000,000 − 20,580,000 = 3,420,000
const caseBEstimate = {
  verdict: 'likely_partial',
  claimedPaise: 24_000_000,
  nonPayablePaise: 960_000,
  payablePaise: 20_580_000,
  payableIfEligiblePaise: 20_580_000,
  outOfPocketPaise: 3_420_000,
  waterfall: [
    { ruleId: 'R6', beforePaise: 23_040_000, afterPaise: 20_580_000 },
    { ruleId: 'R7', beforePaise: 20_580_000, afterPaise: 20_580_000 },
    { ruleId: 'R8', beforePaise: 20_580_000, afterPaise: 20_580_000 },
  ],
  results: [...['R1', 'R2', 'R3', 'R4', 'R5'].map(passed), r6CaseB, passed('R7'), passed('R8')],
  planId: 'star-fho',
  wordingVersion: 'V.19',
  rulesAsOf: '2026-10-28',
  engineVersion: '0.1.0',
  factsVersion: 1,
};

// Every code in docs/api.md, plus INTERNAL_ERROR (decided with TC-SH-05).
const API_CODES = [
  'AUTH_REQUIRED', 'AUTH_INVALID', 'VALIDATION_FAILED', 'EMAIL_TAKEN', 'RATE_LIMITED',
  'NOT_FOUND', 'PLAN_NOT_FOUND', 'FILE_TOO_LARGE', 'FILE_TYPE_NOT_ALLOWED',
  'DOCUMENT_LIMIT_REACHED', 'PDF_PASSWORD_PROTECTED', 'LLM_UNAVAILABLE', 'AI_QUOTA_EXCEEDED',
  'LLM_OUTPUT_INVALID', 'INTERNAL_ERROR',
];

describe('RuleResult, Estimate, ErrorCode', () => {
  it('TC-SH-05 results are internally consistent, estimates carry 8 results, error codes are a closed set', () => {
    accepts(RuleResultSchema, { ...passed('R1'), outcome: 'unknown', missingFacts: ['admission_date'] });
    rejects(RuleResultSchema, { ...passed('R1'), outcome: 'unknown', missingFacts: [] });
    rejects(RuleResultSchema, { ...passed('R1'), deductionPaise: 100 });
    rejects(RuleResultSchema, { ...r6CaseB, deductionPaise: 0 });

    accepts(EstimateSchema, caseBEstimate);
    rejects(EstimateSchema, { ...caseBEstimate, results: caseBEstimate.results.slice(0, 7) });

    for (const code of API_CODES) accepts(ErrorCode, code);
    rejects(ErrorCode, 'FORBIDDEN');
  });
});
