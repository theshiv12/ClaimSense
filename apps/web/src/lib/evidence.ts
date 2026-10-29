import type { Fact, RuleResult } from '@claimsense/shared';

export interface EvidenceLine {
  key: Fact['key'];
  quote: string;
  page: number | null;
}

export const evidenceFor = (_r: RuleResult, _facts: Fact[]): EvidenceLine[] => [];
