import type { EstimateView } from '@claimsense/shared';
import { buildAdmissionCard } from '@claimsense/rules';
import Link from 'next/link';
import { formatDate, formatInr } from '@/lib/format';
import { RULE_TITLES, VERDICT_LABELS } from '@/lib/labels';
import { buttonClass } from '../ui/button';
import { Disclaimer } from './disclaimer';
import { PrintButton } from './print-button';

const A4 = '@media print { @page { size: A4; margin: 14mm; } body { background: #fff; } }';

/** One A4 page to carry to the admission desk: the engine's amounts, waits, room cap, catalog remedies only. */
export function AdmissionCardView({ claimId, view }: { claimId: string; view: EstimateView }) {
  const card = buildAdmissionCard(view.estimate, view.plan, view.remedies);
  const { claim, plan } = view;
  return (
    <article className="mx-auto w-full max-w-[210mm] space-y-5 bg-white p-8 text-ink print:max-w-none print:p-0">
      <style>{A4}</style>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Pre-admission card</p>
          <h1 className="text-2xl font-bold">For {claim.relation} · {claim.treatment}</h1>
          <p className="text-sm text-muted">{plan.planName} (UIN {plan.uin}). Rules as of {formatDate(plan.rulesAsOf)}.</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Link className={buttonClass('ghost')} href={`/claims/${claimId}`}>Back to estimate</Link>
          <PrintButton label="Print / Save as PDF" />
        </div>
      </header>

      <section>
        <p className="text-sm font-semibold">{VERDICT_LABELS[card.verdict].label}</p>
        <p className="text-3xl font-bold">{formatInr(card.payablePaise)} likely paid</p>
        <p className="text-sm text-muted">You pay about {formatInr(card.outOfPocketPaise)}.</p>
      </section>

      {card.roomAdvice.capPerDayPaise !== null ? (
        <section>
          <h2 className="text-lg font-semibold">Room</h2>
          <p className="text-sm">
            Room rent limit: {formatInr(card.roomAdvice.capPerDayPaise)}/day.
            {card.roomAdvice.savingPaise !== null ? ` A room within it removes the ${formatInr(card.roomAdvice.savingPaise)} room-rent deduction.` : ''}
          </p>
        </section>
      ) : null}

      {card.waitsEnd.length > 0 ? (
        <section>
          <h2 className="text-lg font-semibold">Waiting periods</h2>
          <ul className="list-disc pl-5 text-sm">
            {card.waitsEnd.map((w) => (
              <li key={w.ruleId}>{`${RULE_TITLES[w.ruleId]}: ends ${formatDate(w.date)}${w.clauseId ? ` (Clause ${w.clauseId})` : ''}. Medical advice comes first.`}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {card.deskQuestions.length > 0 ? (
        <section>
          <h2 className="text-lg font-semibold">At the admission desk</h2>
          <ul className="list-disc pl-5 text-sm">{card.deskQuestions.map((q) => <li key={q}>{q}</li>)}</ul>
        </section>
      ) : null}

      <section>
        <h2 className="text-lg font-semibold">Documents to carry</h2>
        <ul className="list-disc pl-5 text-sm">{card.documentsToCarry.map((d) => <li key={d}>{d}</li>)}</ul>
      </section>

      <Disclaimer />
    </article>
  );
}
