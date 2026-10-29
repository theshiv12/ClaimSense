'use client';
import type { ActionResult, FactValue } from '@claimsense/shared';
import { useId, useState } from 'react';
import { toView, type StoredFactView, type WireFact } from '@/lib/fact-view';
import { ERROR_MESSAGES, FACT_LABELS, formatFactValue, HEAD_LABELS } from '@/lib/labels';
import { Button } from '../ui/button';
import { Chip } from '../ui/chip';
import { ErrorText } from '../ui/field';
import { CheckIcon, QuestionIcon } from '../ui/icons';
import { FactValueInput, parseInput, toInput } from './fact-value-input';
import { Quote } from './quote';

type FactResult = Promise<ActionResult<{ fact: WireFact }>>;
export interface FactActions {
  confirm: (input: { claimId: string; factId: string }) => FactResult;
  edit: (input: { claimId: string; factId: string; value: FactValue }) => FactResult;
}

const badge = (f: StoredFactView) => {
  if (f.source !== 'document') return <Chip tone="pass" icon={<CheckIcon />}>{f.source === 'user-corrected' ? 'Corrected by you' : 'Entered by you'}</Chip>;
  if (f.confirmedByUser) return <Chip tone="pass" icon={<CheckIcon />}>Confirmed</Chip>;
  if (f.usable) return <Chip tone="pass" icon={<CheckIcon />}>Verified</Chip>;
  return <Chip tone="warn" icon={<QuestionIcon />}>Please check</Chip>;
};

/** One fact with its quote and page. Unverified facts count as unknown until the user confirms them. */
export function FactRow({ claimId, fact: initial, actions, onChange }: { claimId: string; fact: StoredFactView; actions: FactActions; onChange?: (f: StoredFactView) => void }) {
  const id = useId();
  const [fact, setFact] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(toInput(fact.key, fact.value));
  const [error, setError] = useState<string | null>(null);
  const label = fact.key === 'bill_line_item' ? `${FACT_LABELS.bill_line_item}: ${HEAD_LABELS[fact.head]}` : FACT_LABELS[fact.key];

  const done = (r: Awaited<FactResult>) => {
    if (!r.ok) return setError(ERROR_MESSAGES[r.code]);
    const next = toView(r.data.fact);
    setFact(next);
    setEditing(false);
    setError(null);
    onChange?.(next);
  };

  return (
    <li className="space-y-2 border-b border-border py-3 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs text-muted">{label}</p>
          <p className="text-sm font-semibold text-ink">{fact.status === 'found' || fact.value !== null ? formatFactValue(fact.key, fact.value) : fact.status === 'illegible' ? 'Could not read' : 'Not found'}</p>
        </div>
        <div className="flex items-center gap-2">
          {badge(fact)}
          {!fact.usable && !fact.confirmedByUser && fact.value !== null ? (
            <Button variant="secondary" aria-label={`Confirm ${label}`} onClick={() => void actions.confirm({ claimId, factId: fact.id }).then(done)}>
              Confirm
            </Button>
          ) : null}
          <Button variant="ghost" aria-label={`Edit ${label}`} onClick={() => setEditing((e) => !e)}>
            Edit
          </Button>
        </div>
      </div>
      {fact.sourceQuote && fact.page ? <Quote text={fact.sourceQuote} where={`your document, page ${fact.page}`} /> : null}
      {editing ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-48 flex-1">
            <label htmlFor={`${id}-edit`} className="sr-only">{`New value for ${label}`}</label>
            <FactValueInput id={`${id}-edit`} factKey={fact.key} value={text} onChange={setText} />
          </div>
          <Button
            onClick={() => {
              const value = parseInput(fact.key, text);
              if (value === null) return setError('Please enter a value.');
              void actions.edit({ claimId, factId: fact.id, value }).then(done);
            }}
          >
            Save
          </Button>
        </div>
      ) : null}
      {error ? <ErrorText>{error}</ErrorText> : null}
    </li>
  );
}
