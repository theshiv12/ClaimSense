import type { ClauseRef, FactKey, RuleId, RuleResult } from '@claimsense/shared';

type Params = RuleResult['params'];

interface Base {
  ruleId: RuleId;
  clause: ClauseRef | null;
  usedFacts: FactKey[];
}

const make = (b: Base, outcome: RuleResult['outcome'], reasonCode: string, extra: Partial<RuleResult> = {}): RuleResult => ({
  ...b,
  outcome,
  applicable: true,
  reasonCode,
  deductionPaise: 0,
  missingFacts: [],
  params: {},
  ...extra,
});

export const pass = (b: Base, reasonCode: string, params: Params = {}) => make(b, 'pass', reasonCode, { params });
export const notApplicable = (b: Base, reasonCode: string) => make(b, 'pass', reasonCode, { applicable: false });
export const fail = (b: Base, reasonCode: string, params: Params = {}) => make(b, 'fail', reasonCode, { params });
export const unknown = (b: Base, missingFacts: FactKey[], reasonCode = `${b.ruleId}_MISSING_FACTS`) =>
  make(b, 'unknown', reasonCode, { missingFacts });

/** A deduction of 0 is a pass, so the RuleResult invariant always holds. */
export const deduct = (b: Base, deductionPaise: number, reasonCode: string, passCode: string, params: Params = {}) =>
  deductionPaise > 0 ? make(b, 'deduction', reasonCode, { deductionPaise, params }) : pass(b, passCode, params);

/** The fact keys among `pairs` whose value is null. */
export const missing = (pairs: [FactKey, unknown][]): FactKey[] => pairs.filter(([, v]) => v === null).map(([k]) => k);
