import type { ClaimFacts, Estimate, PlanConfig } from '@claimsense/shared';
import { notImplemented } from './types';

/** Runs R1–R8 in the order of docs/rules-spec.md and builds the estimate. */
export const estimate = (facts: ClaimFacts, plan: PlanConfig, factsVersion: number): Estimate => {
  void facts;
  void plan;
  void factsVersion;
  return notImplemented();
};
