import { redirect } from 'next/navigation';
import { ClaimRow } from '@/components/claim/claim-row';
import { DeleteMyDataButton } from '@/components/claim/delete-buttons';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { currentUser } from '@/server/auth';
import { claimSummaries } from '@/server/views';

export default async function ClaimsPage() {
  const user = await currentUser();
  if (!user) redirect('/login?next=/claims');
  const claims = await claimSummaries(user.id);
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">My checks</h1>
        <ButtonLink href="/claims/new">New check</ButtonLink>
      </div>
      <Card>
        {claims.length === 0 ? (
          <p className="text-sm text-muted">No checks yet.</p>
        ) : (
          <ul>
            {claims.map((c) => (
              <ClaimRow key={c.id} claim={c} />
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <h2 className="text-base font-semibold text-ink">Your data</h2>
        <p className="mb-3 mt-1 text-sm text-muted">
          Uploaded files are never stored. Facts and estimates are deleted automatically after 7 days{user.isGuest ? ' (24 hours for samples)' : ''}.
        </p>
        <DeleteMyDataButton />
      </Card>
    </main>
  );
}
