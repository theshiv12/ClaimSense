import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ClaimsTable } from '@/components/claim/claims-table';
import { DeleteMyDataButton } from '@/components/claim/delete-buttons';
import { Disclaimer } from '@/components/claim/disclaimer';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { claimStats, filterClaims, type ClaimFilter } from '@/lib/claim-stats';
import { formatInr } from '@/lib/format';
import { VERDICT_LABELS } from '@/lib/labels';
import type { ClaimSummary } from '@claimsense/shared';
import { apiPage, currentUser } from '@/lib/api/server';

const FILTERS: ClaimFilter[] = ['all', 'likely_payable', 'likely_partial', 'at_risk'];
const asFilter = (v: unknown): ClaimFilter => (FILTERS.includes(v as ClaimFilter) ? (v as ClaimFilter) : 'all');

export default async function ClaimsPage({ searchParams }: PageProps<'/claims'>) {
  const user = await currentUser();
  if (!user) redirect('/login?next=/claims');
  const sp = await searchParams;
  const status = asFilter(sp.status);
  const claims = await apiPage<ClaimSummary[]>('/api/claims', '/claims');
  const stats = claimStats(claims);
  const shown = filterClaims(claims, status, '');
  const count = (f: ClaimFilter) => (f === 'all' ? stats.checks : stats.byVerdict[f]);
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

      <ClaimsTable
        claims={shown}
        status={status}
        filters={
          <nav aria-label="Filter by status" className="flex flex-wrap gap-1 rounded-xl bg-border/50 p-1 text-sm">
            {FILTERS.map((f) => (
              <Link
                key={f}
                href={f === 'all' ? '/claims' : `/claims?status=${f}`}
                aria-current={f === status ? 'page' : undefined}
                className={`rounded-lg px-3 py-1.5 ${f === status ? 'border border-border bg-white font-semibold text-ink' : 'text-muted hover:text-ink'}`}
              >
                {f === 'all' ? 'All' : VERDICT_LABELS[f].label} <span className="text-xs">{count(f)}</span>
              </Link>
            ))}
          </nav>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">
          Estimates use the rules shown on each check. Facts and estimates are deleted automatically after 7 days{user.isGuest ? ' (24 hours for samples)' : ''}.
        </p>
        <DeleteMyDataButton />
      </div>
    </main>
  );
}
