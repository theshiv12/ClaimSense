'use client';
import type { ActionResult, Estimate, RoomCategory } from '@claimsense/shared';
import { useId, useState } from 'react';
import { simulateRoom } from '@/lib/api/client';
import { formatInr, rupeesToPaise } from '@/lib/format';
import { ERROR_MESSAGES, ROOM_LABELS } from '@/lib/labels';
import { Button } from '../ui/button';
import { ErrorText, Field, inputClass } from '../ui/field';

type Simulate = (input: { claimId: string; category: RoomCategory; rentPerDayPaise: number }) => Promise<ActionResult<{ estimate: Estimate }>>;

const CATEGORIES: RoomCategory[] = ['general', 'shared', 'single', 'deluxe', 'suite'];

/** What-if for a cheaper (or dearer) room. Re-runs the rules engine on the server; nothing is saved. */
export function RoomSimulator({ claimId, currentOutOfPocketPaise, simulate = simulateRoom }: { claimId: string; currentOutOfPocketPaise: number; simulate?: Simulate }) {
  const id = useId();
  const [category, setCategory] = useState<RoomCategory>('shared');
  const [rent, setRent] = useState('4500');
  const [result, setResult] = useState<Estimate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    const paise = rupeesToPaise(rent);
    if (paise === null) {
      setError('Enter the rent per day in rupees, for example 4500.');
      return;
    }
    setBusy(true);
    setError(null);
    const r = await simulate({ claimId, category, rentPerDayPaise: paise });
    setBusy(false);
    if (r.ok) setResult(r.data.estimate);
    else setError(`We could not run this scenario. ${ERROR_MESSAGES[r.code]}`);
  };

  const saving = result ? currentOutOfPocketPaise - result.outOfPocketPaise : 0;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 [&>button]:col-span-2">
        <Field id={`${id}-cat`} label="Room type">
          <select id={`${id}-cat`} className={inputClass} value={category} onChange={(e) => setCategory(e.target.value as RoomCategory)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {ROOM_LABELS[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field id={`${id}-rent`} label="Rent per day (₹)">
          <input id={`${id}-rent`} inputMode="decimal" className={inputClass} value={rent} onChange={(e) => setRent(e.target.value)} />
        </Field>
        <Button onClick={() => void run()} disabled={busy}>
          Try this room
        </Button>
      </div>
      {error ? <ErrorText>{error}</ErrorText> : null}
      {result ? (
        <div aria-live="polite" className="rounded-lg bg-bg p-4 text-sm">
          <p className="text-base font-semibold text-ink">{`${formatInr(result.payablePaise)} of ${formatInr(result.claimedPaise)}`}</p>
          <p className="text-muted">
            likely paid; you pay {formatInr(result.outOfPocketPaise)}
            {saving > 0 ? ` — saves ${formatInr(saving)}` : ''}
          </p>
        </div>
      ) : null}
      <p className="text-xs text-muted">Assumes other charges stay the same. Ask the hospital for its tariff for the room you choose.</p>
    </div>
  );
}
