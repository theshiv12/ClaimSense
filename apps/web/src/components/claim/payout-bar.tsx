import { formatInr } from '@/lib/format';

const pct = (part: number, whole: number) => `${Math.round((part / whole) * 10_000) / 100}%`;

export interface PayoutPart {
  label: string;
  paise: number;
}

// Colours for the parts of "you pay", in order; always paired with a legend word.
const PART_COLOURS = ['bg-cut', 'bg-nonpay', 'bg-risk-fg/50', 'bg-muted/40'];

/** Likely paid vs you pay, as one bar. Widths come straight from the engine's amounts. */
export function PayoutBar({ claimedPaise, payablePaise, breakdown }: { claimedPaise: number; payablePaise: number; breakdown?: PayoutPart[] }) {
  const youPay = claimedPaise - payablePaise;
  const caption = `${formatInr(payablePaise)} of ${formatInr(claimedPaise)}`;
  if (claimedPaise <= 0) return <p className="text-sm text-muted">No bill amounts yet.</p>;
  const parts = (breakdown ?? []).filter((b) => b.paise > 0);
  return (
    <div className="space-y-3">
      <div
        role="img"
        aria-label={`${caption} likely paid; you pay ${formatInr(youPay)}`}
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-border"
      >
        <div data-testid="payout-payable" className="h-full bg-teal" style={{ width: pct(payablePaise, claimedPaise) }} />
        <div data-testid="payout-you-pay" className={`flex h-full ${parts.length ? '' : 'bg-cut'}`} style={{ width: pct(youPay, claimedPaise) }}>
          {parts.map((b, i) => (
            <div key={b.label} data-testid={`payout-part-${i}`} className={`h-full ${PART_COLOURS[i % PART_COLOURS.length]}`} style={{ width: pct(b.paise, youPay) }} />
          ))}
        </div>
      </div>
      {parts.length ? (
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
          <li className="flex items-center gap-1.5"><span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-teal" />Paid by insurer</li>
          {parts.map((b, i) => (
            <li key={b.label} className="flex items-center gap-1.5">
              <span aria-hidden className={`h-2.5 w-2.5 rounded-sm ${PART_COLOURS[i % PART_COLOURS.length]}`} />
              {`${b.label} ${formatInr(b.paise)}`}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex justify-between text-sm">
        <span className="font-semibold text-ink">{caption}</span>
        <span className="text-muted">You pay {formatInr(youPay)}</span>
      </div>
    </div>
  );
}
