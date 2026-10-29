import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const SAMPLES = [
  ['B', 'Knee replacement, Single AC room over the limit', 'Likely partly paid'],
  ['A', 'Admission inside the 30-day initial wait', 'At risk'],
  ['C', 'Cataract inside the 24-month wait', 'At risk'],
  ['D', 'Appendicitis, room within the limit', 'Likely paid in full'],
] as const;

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl space-y-10 px-4 py-14">
      <section className="space-y-4">
        <h1 className="text-4xl font-bold text-ink">ClaimSense</h1>
        <p className="max-w-2xl text-lg text-muted">
          Before a planned admission, see what your health policy is likely to pay, what gets cut and why, with the
          policy clause and the line in your own document for every reason, and what you can do about it.
        </p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/sample/B" prefetch={false}>See a sample (knee replacement)</ButtonLink>
          <ButtonLink href="/claims/new" variant="secondary">Check my policy</ButtonLink>
        </div>
        <p className="text-xs text-muted">Supports Star Family Health Optima (wording V.19). Samples use made-up documents; no AI call is made.</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ['1. Upload', 'Your policy schedule and the hospital’s estimate. AI reads the facts and shows the exact line it read each one from.'],
          ['2. Check', 'Confirm or correct each fact. Anything we could not verify counts as unknown, never as a guess.'],
          ['3. Understand', 'Eight checks from your policy wording: waiting periods, room rent limit, co-pay, sum insured. Code does the maths, not the AI.'],
        ].map(([t, b]) => (
          <Card key={t}>
            <h2 className="text-base font-semibold text-ink">{t}</h2>
            <p className="mt-1 text-sm text-muted">{b}</p>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">Try a sample</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {SAMPLES.map(([id, story, result]) => (
            <li key={id}>
              <a href={`/sample/${id}`} className="block rounded-xl border border-border bg-white p-4 hover:border-teal">
                <p className="text-sm font-semibold text-ink">Sample {id}: {story}</p>
                <p className="text-xs text-muted">{result}</p>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
