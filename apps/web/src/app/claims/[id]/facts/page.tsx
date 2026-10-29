import type { ClaimView, StoredFactView } from '@claimsense/shared';
import { ClaimBar } from '@/components/claim/claim-bar';
import { FactsBoard } from '@/components/claim/facts-board';
import { apiPage } from '@/lib/api/server';

export default async function FactsPage({ params }: PageProps<'/claims/[id]/facts'>) {
  const { id } = await params;
  const path = `/api/claims/${encodeURIComponent(id)}`;
  const claim = await apiPage<ClaimView>(path, `/claims/${id}/facts`);
  const facts = await apiPage<StoredFactView[]>(`${path}/facts`, `/claims/${id}/facts`);
  return (
    <>
      <ClaimBar step="facts" claimId={id} subject={`For ${claim.relation} · ${claim.treatment}`} />
      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-10">
        <FactsBoard claimId={id} initial={facts} />
      </main>
    </>
  );
}
