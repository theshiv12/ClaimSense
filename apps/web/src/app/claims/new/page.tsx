import { redirect } from 'next/navigation';
import { ClaimBar } from '@/components/claim/claim-bar';
import { NewClaimForm } from '@/components/forms/new-claim-form';
import type { PlanOption } from '@claimsense/shared';
import { apiPage, currentUser } from '@/lib/api/server';

export default async function NewClaimPage() {
  const user = await currentUser();
  if (!user || user.isGuest) redirect('/signup?next=/claims/new');
  const plans = await apiPage<PlanOption[]>('/api/plans', '/claims/new');
  return (
    <>
      <ClaimBar step="setup" />
      <main className="mx-auto max-w-[1200px] space-y-5 px-4 py-10">
        <h1 className="sr-only">New check</h1>
        <NewClaimForm plans={plans} />
      </main>
    </>
  );
}
