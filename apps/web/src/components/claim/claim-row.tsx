import Link from 'next/link';
import { formatDate, formatInr } from '@/lib/format';
import { VERDICT_LABELS } from '@/lib/labels';
import type { ClaimSummary } from '@/server/views';
import { Chip } from '../ui/chip';
import { DeleteClaimButton } from './delete-buttons';

export function ClaimRow({ claim }: { claim: ClaimSummary }) {
  const verdict = claim.verdict ? VERDICT_LABELS[claim.verdict] : null;
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-4 last:border-b-0">
      <div>
        <p className="text-sm font-semibold text-ink">
          {claim.treatment} {claim.sampleCaseId ? <span className="text-xs font-normal text-muted">(sample {claim.sampleCaseId})</span> : null}
        </p>
        <p className="text-xs text-muted">
          For {claim.relation} · started {formatDate(claim.createdAt)}
          {claim.payablePaise !== null && claim.claimedPaise !== null ? ` · ${formatInr(claim.payablePaise)} of ${formatInr(claim.claimedPaise)}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {verdict ? <Chip tone={verdict.tone}>{verdict.label}</Chip> : <Chip tone="neutral">Not checked yet</Chip>}
        <Link className="text-sm font-semibold text-teal hover:underline" href={`/claims/${claim.id}`}>
          Open
        </Link>
        <DeleteClaimButton claimId={claim.id} />
      </div>
    </li>
  );
}
