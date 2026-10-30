import type { Estimate, EstimateView } from '@claimsense/shared';
import Link from 'next/link';
import { CheckRow } from '@/components/claim/check-row';
import { ClarifierCard } from '@/components/claim/clarifier-card';
import { ExplainEstimate } from '@/components/claim/explain-estimate';
import { ClaimBar } from '@/components/claim/claim-bar';
import { DeleteClaimButton, DeleteMyDataButton } from '@/components/claim/delete-buttons';
import { Disclaimer } from '@/components/claim/disclaimer';
import { EvidencePanel } from '@/components/claim/evidence-panel';
import { PayoutBar, type PayoutPart } from '@/components/claim/payout-bar';
import { RejectionSteps } from '@/components/claim/rejection-steps';
import { RoomSimulator } from '@/components/claim/room-simulator';
import { VerdictHeadline } from '@/components/claim/verdict-headline';
import { buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { checksWithEvidence } from '@/lib/estimate-layout';
import { formatDate } from '@/lib/format';
import { apiPage } from '@/lib/api/server';

/** What makes up "you pay", from the engine's own amounts; whatever is left is not covered until checks clear. */
const breakdownOf = (e: Estimate): PayoutPart[] => {
  const cut = (id: string) => e.results.find((r) => r.ruleId === id)?.deductionPaise ?? 0;
  const parts = [
    { label: 'Room-rent deduction', paise: cut('R6') },
    { label: 'Non-payables', paise: e.nonPayablePaise },
    { label: 'Co-pay', paise: cut('R7') },
    { label: 'Over sum insured', paise: cut('R8') },
  ];
  const rest = e.outOfPocketPaise - parts.reduce((s, p) => s + p.paise, 0);
  return rest > 0 ? [...parts, { label: 'Not covered until checks clear', paise: rest }] : parts;
};

export default async function EstimatePage({ params }: PageProps<'/claims/[id]'>) {
  const { id } = await params;
  const { claim, plan, estimate, remedies, evidence, precedents, clarifiers, needsYou } = await apiPage<EstimateView>(`/api/claims/${encodeURIComponent(id)}/estimate`, `/claims/${id}`);
  const explained = checksWithEvidence(estimate.results);
  const sample = claim.sampleCaseId ? ` · sample ${claim.sampleCaseId} (made-up documents)` : '';
  return (
    <>
      <ClaimBar step="estimate" claimId={id} pendingFacts={needsYou} subject={`For ${claim.relation} · ${claim.treatment}${sample}`}>
        <DeleteMyDataButton />
      </ClaimBar>
      <main className="mx-auto grid max-w-[1440px] gap-5 px-4 py-6 sm:px-10 lg:grid-cols-[minmax(0,1fr)_420px]">
        <h1 className="sr-only">Estimate</h1>
        <div className="space-y-5">
          <Card className="space-y-6 sm:p-7">
            <VerdictHeadline estimate={estimate} eyebrow={`Likely payout · ${plan.planName} · rules as of ${formatDate(plan.rulesAsOf)}`} />
            <PayoutBar claimedPaise={estimate.claimedPaise} payablePaise={estimate.payablePaise} breakdown={breakdownOf(estimate)} />
            <div className="flex flex-wrap items-start justify-between gap-3 border-t border-border pt-4">
              <ExplainEstimate claimId={id} />
              <Link className={buttonClass('ghost')} href={`/claims/${id}/summary`}>Summary to print or save as PDF</Link>
            </div>
          </Card>

          {clarifiers.length > 0 ? <ClarifierCard claimId={id} clarifiers={clarifiers} /> : null}

          <Card flush className="overflow-hidden">
            <div className="px-5 pb-2 pt-5">
              <h2 className="text-lg font-semibold text-ink">Checks on your policy</h2>
              <p className="text-xs text-muted">
                {plan.planName}, {plan.wordingVersion} (UIN {plan.uin}). Rules as of {formatDate(plan.rulesAsOf)}.
              </p>
            </div>
            <ul>
              {estimate.results.map((r) => (
                <CheckRow
                  key={r.ruleId}
                  result={r}
                  fix={{
                    claimId: id,
                    remedies: remedies.filter((m) => m.ruleId === r.ruleId && m.outcome === r.outcome),
                    currentOutOfPocketPaise: estimate.outOfPocketPaise,
                    precedents: precedents[r.ruleId] ?? [],
                  }}
                />
              ))}
            </ul>
          </Card>

          <Disclaimer />

          <div className="flex flex-wrap items-center gap-3">
            <Link className={buttonClass('secondary')} href={`/claims/${id}/facts`}>Review facts</Link>
            <Link className={buttonClass('ghost')} href="/claims">All my checks</Link>
            <DeleteClaimButton claimId={id} after="list" />
          </div>
        </div>

        <aside className="space-y-5">
          <Card>
            <h2 className="mb-1 text-lg font-semibold text-ink">Compare room types</h2>
            <p className="mb-4 text-sm text-muted">The room changes more than the room charge: other charges are cut in proportion when the room is over the limit.</p>
            <RoomSimulator claimId={id} currentOutOfPocketPaise={estimate.outOfPocketPaise} />
          </Card>

          {explained.map((r) => (
            <Card key={r.ruleId}>
              <EvidencePanel result={r} lines={evidence[r.ruleId] ?? []} />
            </Card>
          ))}

          <Card>
            <h2 className="mb-3 text-lg font-semibold text-ink">If the claim is rejected later</h2>
            <RejectionSteps />
          </Card>
        </aside>
      </main>
    </>
  );
}
