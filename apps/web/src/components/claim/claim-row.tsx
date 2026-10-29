import { formatDate, formatInr } from '@/lib/format';
import type { ClaimSummary } from '@/server/views';
import { ButtonLink } from '../ui/button';
import { Chip } from '../ui/chip';
import { DeleteClaimButton } from './delete-buttons';
import { VerdictChip } from './verdict-headline';

/** One row of the My claims table (Figma 08). */
export function ClaimRow({ claim }: { claim: ClaimSummary }) {
  const money = claim.payablePaise !== null && claim.claimedPaise !== null;
  return (
    <tr className="border-t border-border align-middle">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pass-bg font-semibold text-pass-fg">
            {(claim.relation[0] ?? '?').toUpperCase()}
          </span>
          <div>
            <p className="font-semibold text-ink">{claim.treatment}</p>
            <p className="text-xs text-muted">For {claim.relation}{claim.sampleCaseId ? ` · sample ${claim.sampleCaseId}` : ''}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <p className="text-ink">{claim.planName}</p>
        <p className="text-xs text-muted">{claim.wordingVersion}</p>
      </td>
      <td className="px-3 py-3 text-ink">{formatDate(claim.createdAt)}</td>
      <td className="px-3 py-3">
        {money ? (
          <>
            <p className={`font-semibold ${claim.payablePaise === 0 ? 'text-risk-fg' : 'text-ink'}`}>{formatInr(claim.payablePaise ?? 0)}</p>
            <p className="text-xs text-muted">of {formatInr(claim.claimedPaise ?? 0)} · you pay {formatInr(claim.outOfPocketPaise ?? 0)}</p>
          </>
        ) : (
          <p className="text-muted">—</p>
        )}
      </td>
      <td className="px-3 py-3">{claim.verdict ? <VerdictChip verdict={claim.verdict} /> : <Chip tone="neutral">Not checked yet</Chip>}</td>
      <td className="px-3 py-3">
        <p className="text-ink">Facts only</p>
        <p className="text-xs text-muted">Deleted {formatDate(claim.expiresAt)}</p>
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center justify-end gap-1">
          <ButtonLink href={`/claims/${claim.id}`} variant="secondary">Open</ButtonLink>
          <DeleteClaimButton claimId={claim.id} />
        </div>
      </td>
    </tr>
  );
}
