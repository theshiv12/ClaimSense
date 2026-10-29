import { Disclaimer } from '@/components/claim/disclaimer';
import { PayoutBar } from '@/components/claim/payout-bar';
import { VerdictChip } from '@/components/claim/verdict-headline';
import { SampleButton } from '@/components/forms/sample-button';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatInr } from '@/lib/format';
import { sampleEstimateView } from '@/server/views';

const SAMPLES = [
  ['B', 'Knee replacement, Single AC room over the limit', 'Likely partly paid'],
  ['A', 'Admission inside the initial waiting period', 'At risk'],
  ['C', 'Cataract inside its specific-disease waiting period', 'At risk'],
  ['D', 'Appendicitis, room within the limit', 'Likely paid in full'],
] as const;

const STEPS = [
  ['Upload policy and estimate', 'PDFs or phone photos. AI reads the facts and shows the exact line each one came from.'],
  ['Confirm the facts', 'Fix anything we misread. Anything we could not verify counts as unknown, never as a guess.'],
  ['See the payout and your options', 'Waiting periods, room rent limit, co-pay, sum insured. Code does the maths, not the AI.'],
] as const;

const short = (q: string, max = 90) => (q.length > max ? `${q.slice(0, max).trimEnd()}…` : q);

export default async function Home({ searchParams }: PageProps<'/'>) {
  const busy = (await searchParams).sample === 'busy';
  const sample = sampleEstimateView();
  return (
    <main className="mx-auto max-w-[1440px] space-y-14 px-4 py-14 sm:px-20">
      <section className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_500px]">
        <div className="space-y-6">
          <span className="inline-block rounded-full bg-pass-bg px-3 py-1 text-xs font-semibold text-pass-fg">For personal health policies in India</span>
          <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-6xl">Know what your health policy will pay, before you’re admitted.</h1>
          <p className="max-w-2xl text-lg text-muted">
            Upload your policy and the hospital’s estimate. See the likely payout, what gets cut and why, with the exact clause
            and the line in your own document, and what you can do about it.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/claims/new">Check my claim</ButtonLink>
            <SampleButton caseId="B" variant="secondary">See a sample (knee replacement)</SampleButton>
          </div>
          {busy ? <p role="alert" className="rounded-lg bg-warn-bg px-3 py-2 text-sm text-warn-fg">Too many samples were opened from this network. Please try again in an hour.</p> : null}
          <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
            <li>Never shared with insurers</li>
            <li>Files read, then discarded</li>
            <li>Estimate, not a guarantee</li>
          </ul>
        </div>

        {sample ? (
          <Card className="space-y-5 p-7">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Sample estimate · knee replacement</p>
              <VerdictChip verdict={sample.estimate.verdict} />
            </div>
            <div>
              <p className="text-4xl font-bold text-ink">{formatInr(sample.estimate.payablePaise)}</p>
              <p className="text-sm text-muted">
                likely payable of {formatInr(sample.estimate.claimedPaise)} · you pay about {formatInr(sample.estimate.outOfPocketPaise)}
              </p>
            </div>
            <PayoutBar
              claimedPaise={sample.estimate.claimedPaise}
              payablePaise={sample.estimate.payablePaise}
              breakdown={[
                { label: 'Room-rent deduction', paise: sample.room?.deductionPaise ?? 0 },
                { label: 'Non-payables', paise: sample.estimate.nonPayablePaise },
              ]}
            />
            {sample.room?.clause ? (
              <blockquote className="border-l-4 border-teal bg-bg px-4 py-3 text-xs text-muted">
                “{short(sample.room.clause.quote)}” · Clause {sample.room.clause.clauseId}
              </blockquote>
            ) : null}
            <p className="text-xs text-muted">Made-up documents, real rules. Only your insurer decides.</p>
          </Card>
        ) : null}
      </section>

      <section id="how" className="grid scroll-mt-6 gap-5 sm:grid-cols-3">
        {STEPS.map(([title, body], i) => (
          <Card key={title} className="p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Step {i + 1}</p>
            <h2 className="mt-2 text-lg font-semibold text-ink">{title}</h2>
            <p className="mt-1 text-sm text-muted">{body}</p>
          </Card>
        ))}
      </section>

      <section id="samples" className="scroll-mt-6 space-y-3">
        <h2 className="text-xl font-semibold text-ink">Sample cases</h2>
        <p className="text-sm text-muted">Supports Star Family Health Optima (wording V.19). Samples use made-up documents; no AI call is made.</p>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SAMPLES.map(([id, story, result]) => (
            <li key={id} className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-white p-5">
              <div>
                <p className="text-sm font-semibold text-ink">Sample {id}: {story}</p>
                <p className="text-xs text-muted">{result}</p>
              </div>
              <SampleButton caseId={id} variant="secondary">Open sample {id}</SampleButton>
            </li>
          ))}
        </ul>
      </section>

      <section id="privacy" className="scroll-mt-6 space-y-3">
        <h2 className="text-xl font-semibold text-ink">Privacy</h2>
        <ul className="grid gap-3 text-sm text-muted sm:grid-cols-3">
          <li className="rounded-xl border border-border bg-white p-5"><strong className="block text-ink">Files are never stored</strong>We read each file, save the facts, and discard the bytes.</li>
          <li className="rounded-xl border border-border bg-white p-5"><strong className="block text-ink">Deleted after 7 days</strong>Facts and estimates expire automatically. Delete them any time.</li>
          <li className="rounded-xl border border-border bg-white p-5"><strong className="block text-ink">Never shared with your insurer</strong>Documents are read by Google Gemini to extract facts; nothing is sent to insurers or TPAs.</li>
        </ul>
        <Disclaimer />
      </section>
    </main>
  );
}
