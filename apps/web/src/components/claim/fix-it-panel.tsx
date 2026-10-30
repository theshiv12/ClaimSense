'use client';
import type { ActionResult, Estimate, Remedy, RoomCategory, RuleResult } from '@claimsense/shared';
import Link from 'next/link';
import { useState } from 'react';
import { simulateRoom } from '@/lib/api/client';
import { formatInr } from '@/lib/format';
import { ERROR_MESSAGES, explain, FACT_LABELS } from '@/lib/labels';
import { Button, buttonClass } from '../ui/button';
import { ErrorText } from '../ui/field';
import { Disclaimer } from './disclaimer';
import { RejectionSteps } from './rejection-steps';
import { RemediesPanel } from './remedies-panel';

type Simulate = (input: { claimId: string; category: RoomCategory; rentPerDayPaise: number }) => Promise<ActionResult<{ estimate: Estimate }>>;

export interface FixItProps {
  claimId: string;
  /** This rule's remedies for this outcome, from config/remedies.json only (golden rule 10). */
  remedies: Remedy[];
  currentOutOfPocketPaise: number;
  simulate?: Simulate;
}

/**
 * "What can I do?" for one check (docs/one-night-build.md §1: the remedies panel plus the room what-if; no chat).
 * One concrete next step per outcome: a room within the limit (R6 cut), the missing facts (unknown), or the
 * escalation path (fail). Amounts come from the engine via the API, never from here.
 */
export function FixItPanel({ id, result, claimId, remedies, currentOutOfPocketPaise, simulate = simulateRoom }: FixItProps & { id: string; result: RuleResult }) {
  const [scenario, setScenario] = useState<Estimate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const cap = result.params.capPerDayPaise;
  const canTryRoom = result.ruleId === 'R6' && result.outcome === 'deduction' && typeof cap === 'number';

  const tryRoom = async () => {
    if (typeof cap !== 'number') return;
    setBusy(true);
    setError(null);
    const r = await simulate({ claimId, category: 'shared', rentPerDayPaise: cap });
    setBusy(false);
    if (r.ok) setScenario(r.data.estimate);
    else setError(`We could not run this scenario. ${ERROR_MESSAGES[r.code]}`);
  };

  const saving = scenario ? currentOutOfPocketPaise - scenario.outOfPocketPaise : 0;
  return (
    <section id={id} aria-label="What you can do" className="mt-3 space-y-4 rounded-lg border border-border bg-white p-4">
      <p className="text-sm text-ink">{explain(result)}</p>
      <RemediesPanel remedies={remedies} showRule={false} />

      {canTryRoom ? (
        <div className="space-y-2">
          <Button variant="secondary" disabled={busy} onClick={() => void tryRoom()}>
            Try a room within the limit
          </Button>
          <p className="text-xs text-muted">Twin sharing at the policy’s limit of {formatInr(cap)}/day. Ask the hospital for its tariff.</p>
          {error ? <ErrorText>{error}</ErrorText> : null}
          {scenario ? (
            <div aria-live="polite" className="rounded-lg bg-bg p-3 text-sm">
              <p className="font-semibold text-ink">{`${formatInr(scenario.payablePaise)} of ${formatInr(scenario.claimedPaise)}`}</p>
              <p className="text-muted">
                likely paid; you pay {formatInr(scenario.outOfPocketPaise)}
                {saving > 0 ? ` — saves ${formatInr(saving)}` : ''}
              </p>
              <p className="text-xs text-muted">Assumes other charges stay the same.</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {result.outcome === 'unknown' && result.missingFacts.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {result.missingFacts.map((key) => (
            <Link key={key} href={`/claims/${encodeURIComponent(claimId)}/facts?add=${key}`} className={buttonClass('secondary', 'py-1.5')}>
              {`Add ${FACT_LABELS[key]}`}
            </Link>
          ))}
        </div>
      ) : null}

      {result.outcome === 'fail' ? (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-ink">If the insurer rejects or cuts the claim</h4>
          <RejectionSteps />
        </div>
      ) : null}

      <Disclaimer />
    </section>
  );
}
