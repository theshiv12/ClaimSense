import type { EstimateView } from '@claimsense/shared';
import { formatDate, formatInr } from '@/lib/format';
import { explain, RULE_TITLES, VERDICT_LABELS } from '@/lib/labels';
import { Disclaimer } from './disclaimer';
import { PrintButton } from './print-button';
import { RejectionSteps } from './rejection-steps';
import { StatusChip } from './status-chip';

/**
 * FR-12: a one-page summary to print or save as PDF (ADR-011). Everything comes from the estimate view:
 * the engine's amounts, each check with its clause, the catalog remedies, the escalation steps.
 */
export function SummaryView({ view }: { view: EstimateView }) {
  const { claim, plan, estimate: e, remedies } = view;
  return (
    <article className="mx-auto max-w-3xl space-y-6 bg-white p-8 text-ink print:max-w-none print:p-0">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">ClaimSense estimate summary</p>
          <h1 className="text-2xl font-bold">
            For {claim.relation} · {claim.treatment}
          </h1>
          <p className="text-sm text-muted">
            {plan.planName}, {plan.wordingVersion} (UIN {plan.uin}). Rules as of {formatDate(plan.rulesAsOf)}. Printed {formatDate(new Date().toISOString().slice(0, 10))}.
          </p>
        </div>
        <PrintButton />
      </header>

      <section className="space-y-1">
        <p className="text-sm font-semibold">{VERDICT_LABELS[e.verdict].label}</p>
        <p className="text-3xl font-bold">{`${formatInr(e.payablePaise)} of ${formatInr(e.claimedPaise)}`}</p>
        <p className="text-sm text-muted">
          likely paid; you pay {formatInr(e.outOfPocketPaise)}
          {e.nonPayablePaise > 0 ? `, including ${formatInr(e.nonPayablePaise)} of items the policy never pays` : ''}.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Checks on your policy</h2>
        <ul className="divide-y divide-border border-y border-border">
          {e.results.map((r) => (
            <li key={r.ruleId} className="flex items-start justify-between gap-3 py-2 text-sm">
              <div>
                <p className="font-semibold">{RULE_TITLES[r.ruleId]}</p>
                <p className="text-muted">{explain(r)}</p>
                {r.clause ? <p className="text-xs text-muted">{`Clause ${r.clause.clauseId}, page ${r.clause.page}`}</p> : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {r.outcome === 'deduction' ? <span className="font-semibold text-warn-fg">−{formatInr(r.deductionPaise)}</span> : null}
                <StatusChip outcome={r.outcome} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {remedies.length > 0 ? (
        <section>
          <h2 className="mb-2 text-lg font-semibold">What you can do</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {remedies.map((m) => (
              <li key={m.id}>
                <strong>{m.title}.</strong> <span className="text-muted">{m.body}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="break-inside-avoid">
        <h2 className="mb-2 text-lg font-semibold">If the claim is rejected later</h2>
        <RejectionSteps />
      </section>

      <Disclaimer />
    </article>
  );
}
