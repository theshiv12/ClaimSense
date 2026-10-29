import type { Estimate } from '@claimsense/shared';
import { formatInr } from '@/lib/format';
import { VERDICT_LABELS } from '@/lib/labels';
import { Chip } from '../ui/chip';
import { CheckIcon, CrossIcon, MinusIcon } from '../ui/icons';

const ICONS = { pass: CheckIcon, warn: MinusIcon, risk: CrossIcon };

export function VerdictHeadline({ estimate }: { estimate: Estimate }) {
  const { label, tone } = VERDICT_LABELS[estimate.verdict];
  const Icon = ICONS[tone];
  const notEligible = estimate.payablePaise === 0 && estimate.payableIfEligiblePaise > 0;
  return (
    <div className="space-y-2">
      <Chip tone={tone} icon={<Icon />}>
        {label}
      </Chip>
      <p className="text-3xl font-bold text-ink">
        {formatInr(estimate.payablePaise)} <span className="text-lg font-medium text-muted">likely paid of {formatInr(estimate.claimedPaise)}</span>
      </p>
      <p className="text-sm text-muted">
        You pay about <strong className="text-ink">{formatInr(estimate.outOfPocketPaise)}</strong>
        {estimate.nonPayablePaise > 0 ? `, including ${formatInr(estimate.nonPayablePaise)} of items the policy never pays (such as consumables)` : ''}.
      </p>
      {notEligible ? (
        <p className="text-sm text-muted">If the checks marked Fail or Unknown are resolved, the policy would pay about {formatInr(estimate.payableIfEligiblePaise)}.</p>
      ) : null}
    </div>
  );
}
