import { notFound, redirect } from 'next/navigation';
import { FactsBoard } from '@/components/claim/facts-board';
import { currentUser } from '@/server/auth';
import { uploadAndExtract } from '@/server/actions/extract';
import { addFact, confirmFact, editFact } from '@/server/actions/facts';
import { findClaim } from '@/server/scope';
import { factsView } from '@/server/views';

export default async function FactsPage({ params }: PageProps<'/claims/[id]/facts'>) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect(`/login?next=/claims/${id}/facts`);
  const claim = await findClaim(user.id, id);
  if (!claim) notFound();
  const facts = await factsView(user.id, id);
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div>
        <p className="text-sm text-muted">For {claim.subject?.relation} · {claim.subject?.treatment}</p>
        <h1 className="text-2xl font-bold text-ink">Your facts</h1>
      </div>
      <FactsBoard
        claimId={id}
        initial={facts}
        actions={{ confirm: confirmFact, edit: editFact, add: addFact, upload: uploadAndExtract }}
      />
    </main>
  );
}
