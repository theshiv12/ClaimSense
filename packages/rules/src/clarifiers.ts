import type { FactKey, RuleResult } from '@claimsense/shared';
export const pickClarifiers = (_r: RuleResult[], _p: Set<FactKey>): { key: FactKey; mode: 'ask' | 'confirm' }[] => [];
