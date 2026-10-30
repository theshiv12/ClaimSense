import type { Precedent, RuleResult } from '@claimsense/shared';
import { describe, expect, it } from 'vitest';
import { matchPrecedents } from './precedents';

// docs/test-cases.md TC-PREC-*. Synthetic cases only.
const c = (id: string, patch: Partial<Precedent> = {}): Precedent => ({
  id, forum: 'ombudsman', title: `Synthetic case ${id}`, decisionDate: '2024-01-01', insurer: 'Other Insurer', planName: null,
  ruleId: 'R6', outcome: 'deduction', result: 'partly_allowed',
  summary: 'A synthetic summary used only in tests, long enough for the schema to accept it as valid.',
  sourceUrl: `https://example.org/${id}`, citation: `Synthetic ${id}`, verifiedBy: 'tester', ...patch,
});
const r6 = (outcome: RuleResult['outcome']): RuleResult => ({
  ruleId: 'R6', outcome, applicable: true, reasonCode: 'R6_ROOM_OVER_CAP', deductionPaise: outcome === 'deduction' ? 1 : 0,
  clause: null, usedFacts: [], missingFacts: [], params: {},
});

describe('matchPrecedents', () => {
  const cases = [
    c('a', { decisionDate: '2023-05-01' }),
    c('b', { decisionDate: '2024-06-01' }),
    c('star-old', { insurer: 'Star Health and Allied Insurance', decisionDate: '2022-01-01' }),
    c('star-new', { insurer: 'Star Health and Allied Insurance', decisionDate: '2024-02-01' }),
    c('c', { decisionDate: '2024-06-01' }),
    c('ped', { ruleId: 'R4', outcome: 'fail' }),
  ];

  it('TC-PREC-01 same rule and outcome, same insurer first, max 3, stable order', () => {
    // Star Health first (newest first), then the rest by date (newest), ties by id: b, c.
    expect(matchPrecedents(cases, 'Star Health and Allied Insurance', r6('deduction')).map((p) => p.id)).toEqual(['star-new', 'star-old', 'b']);
    expect(matchPrecedents(cases, 'Someone Else', r6('deduction')).map((p) => p.id)).toEqual(['star-new', 'b', 'c']);
  });

  it('TC-PREC-02 nothing for a pass', () => {
    expect(matchPrecedents(cases, 'Star Health and Allied Insurance', r6('pass'))).toEqual([]);
  });
});
