import { formatInr } from '@/lib/format';

const pct = (part: number, whole: number) => `${Math.round((part / whole) * 10_000) / 100}%`;

/** Likely paid vs you pay, as one bar. Widths come straight from the engine's amounts. */
export function PayoutBar({ claimedPaise, payablePaise }: { claimedPaise: number; payablePaise: number }) {
  const youPay = claimedPaise - payablePaise;
  const caption = `${formatInr(payablePaise)} of ${formatInr(claimedPaise)}`;
  if (claimedPaise <= 0) return <p className="text-sm text-muted">No bill amounts yet.</p>;
  return (
    <div className="space-y-2">
      <div
        role="img"
        aria-label={`${caption} likely paid; you pay ${formatInr(youPay)}`}
        className="flex h-3 w-full overflow-hidden rounded-full bg-border"
      >
        <div data-testid="payout-payable" className="h-full bg-teal" style={{ width: pct(payablePaise, claimedPaise) }} />
        <div data-testid="payout-you-pay" className="h-full bg-warn-fg/60" style={{ width: pct(youPay, claimedPaise) }} />
      </div>
      <div className="flex justify-between text-sm">
        <span className="font-semibold text-ink">{caption}</span>
        <span className="text-muted">You pay {formatInr(youPay)}</span>
      </div>
    </div>
  );
}
