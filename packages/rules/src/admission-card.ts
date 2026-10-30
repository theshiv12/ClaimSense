import { FACT_LABELS, type Estimate, type PlanConfig, type Remedy, type RuleId } from '@claimsense/shared';

/** What to carry to the admission desk, from the engine's estimate and the remedy catalog only (golden rules 1, 10). */
export interface AdmissionCard {
  planName: string;
  verdict: Estimate['verdict'];
  payablePaise: number;
  outOfPocketPaise: number;
  roomAdvice: { capPerDayPaise: number | null; savingPaise: number | null };
  waitsEnd: { ruleId: RuleId; date: string; clauseId: string | null }[];
  deskQuestions: string[];
  documentsToCarry: string[];
}

const WAITS: RuleId[] = ['R2', 'R3', 'R4'];
const MAX_QUESTIONS = 5;

export const buildAdmissionCard = (estimate: Estimate, plan: Pick<PlanConfig, 'planName'>, remedies: Remedy[]): AdmissionCard => {
  const open = estimate.results.filter((r) => r.outcome !== 'pass');
  const r6 = estimate.results.find((r) => r.ruleId === 'R6');
  const cap = r6?.params.capPerDayPaise;
  return {
    planName: plan.planName,
    verdict: estimate.verdict,
    payablePaise: estimate.payablePaise,
    outOfPocketPaise: estimate.outOfPocketPaise,
    roomAdvice: {
      capPerDayPaise: typeof cap === 'number' ? cap : null,
      savingPaise: r6?.outcome === 'deduction' ? r6.deductionPaise : null,
    },
    waitsEnd: open.flatMap((r) =>
      WAITS.includes(r.ruleId) && r.outcome === 'fail' && typeof r.params.waitEnds === 'string'
        ? [{ ruleId: r.ruleId, date: r.params.waitEnds, clauseId: r.clause?.clauseId ?? null }]
        : [],
    ),
    deskQuestions: remedies
      .filter((m) => open.some((r) => r.ruleId === m.ruleId && r.outcome === m.outcome))
      .map((m) => m.title)
      .slice(0, MAX_QUESTIONS),
    documentsToCarry: [
      'Policy schedule',
      'Hospital estimate',
      ...new Set(open.flatMap((r) => r.missingFacts).map((k) => `A document showing: ${FACT_LABELS[k]}`)),
    ],
  };
};
