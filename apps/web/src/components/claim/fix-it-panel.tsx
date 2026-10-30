'use client';
import type { Precedent, Remedy, RuleResult } from '@claimsense/shared';
import Link from 'next/link';
import { explain, FACT_LABELS, RULE_TITLES } from '@/lib/labels';
import { buttonClass } from '../ui/button';
import { CheckChat } from './check-chat';
import { Disclaimer } from './disclaimer';
import { RejectionSteps } from './rejection-steps';
import { RemediesPanel } from './remedies-panel';
import { SimilarCases } from './similar-cases';

export interface FixItProps {
  claimId: string;
  /** This rule's remedies for this outcome, from config/remedies.json only (golden rule 10). */
  remedies: Remedy[];
  /** Reviewed public decisions on the same rule and outcome (config/precedents.json, ADR-010). */
  precedents?: Precedent[];
}

/**
 * "What can I do?" for one check: the catalog remedies, then one concrete next step per outcome (the missing
 * facts for Unknown, the escalation path for Fail), similar reviewed cases and the grounded check chat. No
 * simulation (ADR-012): the only amounts are the engine's estimate of the real facts.
 */
export function FixItPanel({ id, result, claimId, remedies, precedents = [] }: FixItProps & { id: string; result: RuleResult }) {
  return (
    <section id={id} aria-label={`What you can do: ${RULE_TITLES[result.ruleId]}`} className="mt-3 space-y-4 rounded-lg border border-border bg-white p-4">
      {/* The row above already gives the reason; for a fail it is repeated here so medical advice comes first. */}
      {result.outcome === 'fail' ? <p className="text-sm text-ink">{explain(result)}</p> : null}
      <RemediesPanel remedies={remedies} showRule={false} />

      {result.outcome === 'unknown' && result.missingFacts.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-muted">Enter each one exactly as your documents show. If a value was read from a document, confirm or correct it instead.</p>
          <div className="flex flex-wrap gap-2">
            {result.missingFacts.map((key) => (
              <Link key={key} href={`/claims/${encodeURIComponent(claimId)}/facts?add=${key}`} className={buttonClass('secondary', 'py-1.5')}>
                {`Add ${FACT_LABELS[key]}`}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {result.outcome === 'fail' ? (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-ink">If the insurer rejects or cuts the claim</h4>
          <RejectionSteps />
        </div>
      ) : null}

      {result.outcome !== 'pass' ? (
        <>
          <SimilarCases cases={precedents} />
          <CheckChat claimId={claimId} ruleId={result.ruleId} outcome={result.outcome} hasCases={precedents.length > 0} />
        </>
      ) : null}

      <Disclaimer />
    </section>
  );
}
