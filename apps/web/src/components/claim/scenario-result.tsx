import type { ActionResult, Estimate, RoomCategory } from '@claimsense/shared';
import { formatInr } from '@/lib/format';

/** Runs the engine for another room (lib/api/client.simulateRoom); injectable so tests pass a fake. */
export type Simulate = (input: { claimId: string; category: RoomCategory; rentPerDayPaise: number }) => Promise<ActionResult<{ estimate: Estimate }>>;

/** A room what-if result, shared by the room simulator and the "What can I do?" preset. Amounts come from the engine. */
export function ScenarioResult({ result, currentOutOfPocketPaise }: { result: Estimate; currentOutOfPocketPaise: number }) {
  const saving = currentOutOfPocketPaise - result.outOfPocketPaise;
  return (
    <div aria-live="polite" className="rounded-lg bg-bg p-4 text-sm">
      <p className="text-base font-semibold text-ink">{`${formatInr(result.payablePaise)} of ${formatInr(result.claimedPaise)}`}</p>
      <p className="text-muted">
        likely paid; you pay {formatInr(result.outOfPocketPaise)}
        {saving > 0 ? ` — saves ${formatInr(saving)}` : ''}
      </p>
    </div>
  );
}
