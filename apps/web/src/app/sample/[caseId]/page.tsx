import { notFound } from 'next/navigation';
import { SampleButton } from '@/components/forms/sample-button';
import { Card } from '@/components/ui/card';

const STORIES: Record<string, string> = {
  A: 'Gastroenteritis, admitted inside the 30-day initial wait.',
  B: 'Knee replacement for a parent, Single AC room over the room rent limit.',
  C: 'Cataract surgery inside the 24-month specific-disease wait.',
  D: 'Appendicitis, room within the limit.',
};

// A shareable sample link. Opening it changes nothing; the button starts the sample with a POST.
export default async function SamplePage({ params }: PageProps<'/sample/[caseId]'>) {
  const caseId = (await params).caseId.toUpperCase();
  const story = STORIES[caseId];
  if (!story) notFound();
  return (
    <main className="mx-auto max-w-md px-4 py-14">
      <Card className="space-y-4">
        <h1 className="text-2xl font-bold text-ink">Sample {caseId}</h1>
        <p className="text-sm text-muted">{story} Made-up documents; no AI call is made.</p>
        <SampleButton caseId={caseId}>Open sample {caseId}</SampleButton>
      </Card>
    </main>
  );
}
