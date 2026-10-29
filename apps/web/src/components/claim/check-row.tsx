import type { RuleResult } from '@claimsense/shared';
import { formatInr } from '@/lib/format';
import { explain, RULE_TITLES } from '@/lib/labels';
import { Quote } from './quote';
import { StatusChip } from './status-chip';

/** One of the eight checks: status, plain-English reason, the plan clause it rests on. */
export function CheckRow({ result }: { result: RuleResult }) {
  const { clause } = result;
  return (
    <li className="space-y-2 border-b border-border py-4 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <StatusChip outcome={result.outcome} />
          <h3 className="text-sm font-semibold text-ink">
            {result.ruleId} · {RULE_TITLES[result.ruleId]}
          </h3>
        </div>
        {result.outcome === 'deduction' ? (
          <span className="text-sm font-semibold text-warn-fg">−{formatInr(result.deductionPaise)}</span>
        ) : null}
      </div>
      <p className="text-sm text-muted">{explain(result)}</p>
      {clause ? (
        <Quote
          text={clause.quote}
          where={`Clause ${clause.clauseId}, page ${clause.page}${clause.source === 'regulation' ? ', regulation' : ', policy wording'}`}
        />
      ) : (
        <p className="text-xs text-muted">Source: your policy schedule.</p>
      )}
    </li>
  );
}
