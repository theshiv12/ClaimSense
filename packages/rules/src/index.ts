/** Rule identifiers, in evaluation order. Values and clauses live in config/plans, never here. */
export const RULE_IDS = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8'] as const;
export type RuleId = (typeof RULE_IDS)[number];
