import type { Verdict } from '@claimsense/shared';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ClaimRow } from '@/components/claim/claim-row';
import { DeleteMyDataButton } from '@/components/claim/delete-buttons';
import { Disclaimer } from '@/components/claim/disclaimer';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { inputClass } from '@/components/ui/field';
import { claimStats, filterClaims, type ClaimFilter } from '@/lib/claim-stats';
import { formatInr } from '@/lib/format';
import { VERDICT_LABELS } from '@/lib/labels';
import { currentUser } from '@/server/auth';
import { claimSummaries } from '@/server/views';

const FILTERS: ClaimFilter[] = ['all', 'likely_payable', 'likely_partial', 'at_risk'];
const asFilter = (v: unknown): ClaimFilter => (FILTERS.includes(v as ClaimFilter) ? (v as ClaimFilter) : 'all');

export default async function ClaimsPage({ searchParams }: PageProps<'/claims'>) {
  const user = await currentUser();
  if (!user) redirect('/login?next=/claims');
  const sp = await searchParams;
  const status = asFilter(sp.status);
  const q = typeof sp.q === 'string' ? sp.q.slice(0, 100) : '';
  const claims = await claimSummaries(user.id);
  const stats = claimStats(claims);
  const shown = filterClaims(claims, status, q);
  const count = (f: ClaimFilter) => (f === 'all' ? stats.checks : stats.byVerdict[f as Verdict]);
  const href = (f: ClaimFilter) => `/claims?${new URLSearchParams({ ...(f === 'all' ? {} : { status: f }), ...(q ? { q } : {}) }).toString()}`;
  const tiles = [
    ['Checks', String(stats.checks), 'kept for 7 days each'],
    ['Estimated payout', formatInr(stats.payablePaise), `across ${stats.checked} checked ${stats.checked === 1 ? 'claim' : 'claims'}`],
    ['You may pay', formatInr(stats.outOfPocketPaise), 'room rent, non-payables and other cuts'],
    ['Files kept', '0', 'files are read, then discarded'],
  ];
  return (
    <main className="mx-auto max-w-[1440px] space-y-6 px-4 py-10 sm:px-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-ink">My claims</h1>
          <p className="text-sm text-muted">Past checks and their estimates. Re-open one to change facts or try a different room.</p>
        </div>
        <ButtonLink href="/claims/new">+ New check</ButtonLink>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map(([label, value, note]) => (
          <Card key={label}>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
            <p className="mt-1 text-3xl font-bold text-ink">{value}</p>
            <p className="text-xs text-muted">{note}</p>
          </Card>
        ))}
      </div>
      {stats.checked > 0 ? <Disclaimer /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Filter by status" className="flex flex-wrap gap-1 rounded-xl bg-border/50 p-1 text-sm">
          {FILTERS.map((f) => (
            <Link
              key={f}
              href={href(f)}
              aria-current={f === status ? 'page' : undefined}
              className={`rounded-lg px-3 py-1.5 ${f === status ? 'border border-border bg-white font-semibold text-ink' : 'text-muted hover:text-ink'}`}
            >
              {f === 'all' ? 'All' : VERDICT_LABELS[f].label} <span className="text-xs">{count(f)}</span>
            </Link>
          ))}
        </nav>
        <form action="/claims" className="w-full sm:w-80">
          {status !== 'all' ? <input type="hidden" name="status" value={status} /> : null}
          <label htmlFor="claim-search" className="sr-only">Search by person or treatment</label>
          <input id="claim-search" name="q" defaultValue={q} placeholder="Search by person or treatment" className={inputClass} />
        </form>
      </div>

      <Card flush className="overflow-x-auto">
        {shown.length === 0 ? (
          <p className="p-5 text-sm text-muted">{claims.length === 0 ? 'No checks yet.' : 'No checks match.'}</p>
        ) : (
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Claim</th>
                <th scope="col" className="px-3 py-3 font-semibold">Insurer · plan</th>
                <th scope="col" className="px-3 py-3 font-semibold">Checked</th>
                <th scope="col" className="px-3 py-3 font-semibold">Estimate</th>
                <th scope="col" className="px-3 py-3 font-semibold">Status</th>
                <th scope="col" className="px-3 py-3 font-semibold">Your data</th>
                <th scope="col" className="px-5 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <ClaimRow key={c.id} claim={c} />
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">
          Estimates use the rules shown on each check. Facts and estimates are deleted automatically after 7 days{user.isGuest ? ' (24 hours for samples)' : ''}.
        </p>
        <DeleteMyDataButton />
      </div>
    </main>
  );
}
