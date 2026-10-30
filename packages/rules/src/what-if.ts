import type { ClaimFacts, Estimate, PlanConfig } from '@claimsense/shared';
export type WhatIfPatch = Record<string, unknown>;
export const simulateFacts = (_f: ClaimFacts, _p: PlanConfig, _patch: WhatIfPatch, _v: number): Estimate => { throw new Error('todo'); };
