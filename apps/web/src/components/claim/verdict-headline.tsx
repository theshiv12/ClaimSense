import type { Estimate } from '@claimsense/shared';
import { formatInr } from '@/lib/format';
import { VERDICT_LABELS } from '@/lib/labels';
import { Chip } from '../ui/chip';
import { CheckIcon, CrossIcon, MinusIcon } from '../ui/icons';

const ICONS = { pass: CheckIcon, warn: MinusIcon, risk: CrossIcon };

export function VerdictChip({ verdict }: { verdict: Estimate['verdict'] }) {
  const { label, tone } = VERDICT_LABELS[verdict];
  const Icon = ICONS[tone];
  return (
    <Chip tone={tone} icon={<Icon />}>
      {label}
    </Chip>
  );
}

/** The big numbers on the estimate (Figma 04): likely payable, and what you are likely to pay. */
export function VerdictHeadline({ estimate, eyebrow }: { estimate: Estimate; eyebrow?: string }) {
  const notEligible = estimate.payablePaise === 0 && estimate.payableIfEligiblePaise > 0;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-wider text-muted">{eyebrow}</p> : <span />}
        <VerdictChip verdict={estimate.verdict} />
      </div>
      <div className="flex flex-wrap items-end gap-x-12 gap-y-3">
        <div>
          <p className="text-5xl font-bold tracking-tight text-ink">{formatInr(estimate.payablePaise)}</p>
          <p className="mt-1 text-sm text-muted">likely payable of {formatInr(estimate.claimedPaise)} estimate</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-warn-fg">{formatInr(estimate.outOfPocketPaise)}</p>
          <p className="mt-1 text-sm text-muted">you’re likely to pay</p>
        </div>
      </div>
      {notEligible ? (
        <p className="text-sm text-muted">If the checks marked Fail or Unknown are resolved, the policy would pay about {formatInr(estimate.payableIfEligiblePaise)}.</p>
      ) : null}
    </div>
  );
}
