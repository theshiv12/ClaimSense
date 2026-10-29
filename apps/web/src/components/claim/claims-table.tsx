'use client';
import { useState } from 'react';
import { filterClaims } from '@/lib/claim-stats';
import type { ClaimSummary } from '@/server/views';
import { Card } from '../ui/card';
import { inputClass } from '../ui/field';
import { ClaimRow } from './claim-row';

/**
 * My claims table with search (Figma 08). Search runs in the browser: treatment names never go into a URL,
 * request log or Referer header (golden rule 6). The status filter arrives already applied.
 */
export function ClaimsTable({ claims, status, filters }: { claims: ClaimSummary[]; status: string; filters?: React.ReactNode }) {
  const [q, setQ] = useState('');
  const shown = filterClaims(claims, 'all', q);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {filters}
        <div className="w-full sm:w-80">
          <label htmlFor="claim-search" className="sr-only">Search by person or treatment</label>
          <input id="claim-search" type="search" value={q} maxLength={100} onChange={(e) => setQ(e.target.value)} placeholder="Search by person or treatment" className={inputClass} />
        </div>
      </div>
      <Card flush className="overflow-x-auto">
        {shown.length === 0 ? (
          <p className="p-5 text-sm text-muted">{claims.length === 0 && status === 'all' ? 'No checks yet.' : 'No checks match.'}</p>
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
    </div>
  );
}
