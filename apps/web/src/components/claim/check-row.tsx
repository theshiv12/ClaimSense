'use client';
import type { RuleResult } from '@claimsense/shared';
import { useId, useState } from 'react';
import { formatInr } from '@/lib/format';
import { explain, RULE_TITLES } from '@/lib/labels';
import { Button } from '../ui/button';
import { FixItPanel, type FixItProps } from './fix-it-panel';
import { Quote } from './quote';
import { StatusChip } from './status-chip';

/**
 * One of the eight checks: status, plain-English reason, the plan clause it rests on (Figma 04 row).
 * With `fix`, a check that did not pass gets "What can I do?", which opens its own remedies below the row.
 */
export function CheckRow({ result, fix }: { result: RuleResult; fix?: FixItProps }) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const { clause } = result;
  const cut = result.outcome === 'deduction';
  const canFix = fix !== undefined && result.outcome !== 'pass' && fix.remedies.length > 0;
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
        {canFix ? (
          <Button variant="secondary" className="py-1.5" aria-expanded={open} aria-controls={open ? panelId : undefined} onClick={() => setOpen((o) => !o)}>
            What can I do?
          </Button>
        ) : null}
      </div>
      {/* Mounted only while open; aria-controls is set only then, so it always points at a real element. */}
      {canFix && open ? (
        <div className="basis-full">
          <FixItPanel id={panelId} result={result} {...fix} />
        </div>
      ) : null}
    </li>
  );
}
