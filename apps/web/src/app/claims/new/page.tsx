import { redirect } from 'next/navigation';
import { NewClaimForm } from '@/components/forms/new-claim-form';
import { currentUser } from '@/server/auth';
import { listPlans } from '@/server/plans';

export default async function NewClaimPage() {
  const user = await currentUser();
  if (!user || user.isGuest) redirect('/signup?next=/claims/new');
  const plans = listPlans().map((p) => ({ planId: p.planId, name: `${p.planName} (${p.wordingVersion})` }));
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <h1 className="text-2xl font-bold text-ink">New check</h1>
      <NewClaimForm plans={plans} />
    </main>
  );
}
