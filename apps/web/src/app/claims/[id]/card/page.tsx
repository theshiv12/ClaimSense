import type { EstimateView } from '@claimsense/shared';
import { AdmissionCardView } from '@/components/claim/admission-card-view';
import { apiPage } from '@/lib/api/server';

// The pre-admission card (browser print → PDF). A read: it creates nothing; another user's claim or a bad id is 404.
export default async function CardPage({ params }: PageProps<'/claims/[id]/card'>) {
  const { id } = await params;
  const view = await apiPage<EstimateView>(`/api/claims/${encodeURIComponent(id)}/estimate`, `/claims/${id}/card`);
  return (
    <main className="px-4 py-8 print:p-0">
      <AdmissionCardView claimId={id} view={view} />
    </main>
  );
}
