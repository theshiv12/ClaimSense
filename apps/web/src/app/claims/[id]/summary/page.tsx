import type { EstimateView } from '@claimsense/shared';
import { SummaryView } from '@/components/claim/summary-view';
import { apiPage } from '@/lib/api/server';

// FR-12: the printable summary (browser print → PDF). A read: it creates nothing.
export default async function SummaryPage({ params }: PageProps<'/claims/[id]/summary'>) {
  const { id } = await params;
  const view = await apiPage<EstimateView>(`/api/claims/${encodeURIComponent(id)}/estimate`, `/claims/${id}/summary`);
  return (
    <main className="px-4 py-8 print:p-0">
      <SummaryView view={view} />
    </main>
  );
}
