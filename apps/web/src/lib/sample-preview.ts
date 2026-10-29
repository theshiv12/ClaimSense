import 'server-only';
import { estimate } from '@claimsense/rules';
import { ClaimFactsSchema, LoadablePlanConfigSchema, type SamplePreview } from '@claimsense/shared';
import starFho from '../../../../config/plans/star-fho.json';
import caseB from '../../../../fixtures/cases/B/case.json';

/**
 * The landing card: sample B through the pure rules engine, at render, with no API call (the numbers are
 * never typed in by hand). The plan goes through the same LoadablePlanConfigSchema gate as in the API.
 */
export const samplePreview = (): SamplePreview => {
  const result = estimate(ClaimFactsSchema.parse(caseB), LoadablePlanConfigSchema.parse(starFho), 0);
  return { estimate: result, room: result.results.find((r) => r.ruleId === 'R6') ?? null };
};
