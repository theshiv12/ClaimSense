import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { CheckRow } from '@/components/claim/check-row';
import { DeleteClaimButton, DeleteMyDataButton } from '@/components/claim/delete-buttons';
import { Disclaimer } from '@/components/claim/disclaimer';
import { PayoutBar } from '@/components/claim/payout-bar';
import { RejectionSteps } from '@/components/claim/rejection-steps';
import { RemediesPanel } from '@/components/claim/remedies-panel';
import { RoomSimulator } from '@/components/claim/room-simulator';
import { VerdictHeadline } from '@/components/claim/verdict-headline';
import { buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDate } from '@/lib/format';
import { simulateRoom } from '@/server/actions/estimate';
import { currentUser } from '@/server/auth';
import { estimateView } from '@/server/views';

export default async function EstimatePage({ params }: PageProps<'/claims/[id]'>) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect(`/login?next=/claims/${id}`);
  const view = await estimateView(user.id, id);
  if (!view) notFound();
  const { claim, plan, estimate, remedies } = view;
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div>
        <p className="text-sm text-muted">
          For {claim.subject?.relation} · {claim.subject?.treatment}
          {claim.sampleCaseId ? ` · sample ${claim.sampleCaseId} (made-up documents)` : ''}
        </p>
        <h1 className="sr-only">Estimate</h1>
      </div>

      <Disclaimer />

      <Card className="space-y-5">
        <VerdictHeadline estimate={estimate} />
        <PayoutBar claimedPaise={estimate.claimedPaise} payablePaise={estimate.payablePaise} />
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-ink">The eight checks</h2>
        <p className="text-xs text-muted">
          {plan.planName}, {plan.wordingVersion} (UIN {plan.uin}). Rules as of {formatDate(plan.rulesAsOf)}.
        </p>
        <ul className="mt-2">
          {estimate.results.map((r) => (
            <CheckRow key={r.ruleId} result={r} />
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-1 text-lg font-semibold text-ink">Try a different room</h2>
        <p className="mb-4 text-sm text-muted">The room you choose changes more than the room charge: other charges are cut in proportion when the room is over the limit.</p>
        <RoomSimulator claimId={id} currentOutOfPocketPaise={estimate.outOfPocketPaise} simulate={simulateRoom} />
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold text-ink">What you can do</h2>
        <RemediesPanel remedies={remedies} />
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold text-ink">If the insurer rejects or cuts the claim</h2>
        <RejectionSteps />
      </Card>

      <Disclaimer />

      <div className="flex flex-wrap items-center gap-3">
        <Link className={buttonClass('secondary')} href={`/claims/${id}/facts`}>Review facts</Link>
        <Link className={buttonClass('ghost')} href="/claims">All my checks</Link>
        <DeleteClaimButton claimId={id} after="list" />
      </div>
      <Card>
        <DeleteMyDataButton />
      </Card>
    </main>
  );
}
