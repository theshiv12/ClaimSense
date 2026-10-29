import type { RuleResult } from '@claimsense/shared';
import Link from 'next/link';
import { formatInr } from '@/lib/format';
import { explain, RULE_TITLES } from '@/lib/labels';
import { buttonClass } from '../ui/button';
import { Quote } from './quote';
import { StatusChip } from './status-chip';

/** One of the eight checks: status, plain-English reason, the plan clause it rests on (Figma 04 row). */
export function CheckRow({ result, actionHref }: { result: RuleResult; actionHref?: string }) {
  const { clause } = result;
  const cut = result.outcome === 'deduction';
  return (
    <li className={`flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-3 last:border-b-0 ${cut ? 'bg-warn-bg/40' : ''}`}>
      <div className="min-w-0 flex-1 space-y-1">
        <h3 className="text-sm font-semibold text-ink">{RULE_TITLES[result.ruleId]}</h3>
        <p className="text-xs text-muted">{explain(result)}</p>
        {clause ? (
          <details className="text-xs">
            <summary className="cursor-pointer text-teal">
              Clause {clause.clauseId} · p.{clause.page}
            </summary>
            <div className="mt-2">
              <Quote text={clause.quote} where={clause.source === 'regulation' ? 'regulation' : 'policy wording'} />
            </div>
          </details>
        ) : (
          <p className="text-xs text-muted">Source: your policy schedule.</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {cut ? <span className="rounded-full bg-warn-bg px-2.5 py-0.5 text-sm font-semibold text-warn-fg">−{formatInr(result.deductionPaise)}</span> : null}
        <StatusChip outcome={result.outcome} />
        {actionHref && result.outcome !== 'pass' ? (
          <Link href={actionHref} className={buttonClass('secondary', 'py-1.5')}>What can I do?</Link>
        ) : null}
      </div>
    </li>
  );
}
