'use client';
import type { ActionResult, ClarifierView, FactKey, FactValue, WireFact } from '@claimsense/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { addFact } from '@/lib/api/client';
import { ERROR_MESSAGES } from '@/lib/labels';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { ErrorText } from '../ui/field';
import { FactValueInput, parseInput } from './fact-value-input';

type Add = (input: { claimId: string; key: FactKey; head: 'none'; value: FactValue }) => Promise<ActionResult<{ fact: WireFact }>>;

/**
 * FR-6: at most 2 questions that would settle the most Unknown checks (chosen by the engine's pickClarifiers).
 * Answers are saved as user-stated facts and the estimate re-runs. A value a document already gave is confirmed
 * on the facts page instead of being overridden.
 */
export function ClarifierCard({ claimId, clarifiers, add = addFact }: { claimId: string; clarifiers: ClarifierView[]; add?: Add }) {
  const id = useId();
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toAsk = clarifiers.filter((c) => c.mode === 'ask');

  const save = async () => {
    const values = toAsk.map((c) => ({ key: c.key, value: parseInput(c.key, answers[c.key] ?? '') })).filter((a) => a.value !== null);
    if (values.length === 0) return setError('Answer at least one question.');
    setBusy(true);
    setError(null);
    for (const v of values) {
      const r = await add({ claimId, key: v.key, head: 'none', value: v.value });
      if (!r.ok) {
        setBusy(false);
        return setError(ERROR_MESSAGES[r.code]);
      }
    }
    setBusy(false);
    router.refresh();
  };

  return (
    <Card className="space-y-4 border-warn-fg/30">
      <div>
        <h2 className="text-lg font-semibold text-ink">{clarifiers.length === 1 ? 'One quick question' : 'Two quick questions'}</h2>
        <p className="text-sm text-muted">These settle the most checks marked Unknown. Answer from your policy schedule and medical records, exactly as they say.</p>
      </div>
      {clarifiers.map((c) =>
        c.mode === 'confirm' ? (
          <p key={c.key} className="text-sm text-ink">
            {c.question} A value was read from your document.{' '}
            <Link href={`/claims/${encodeURIComponent(claimId)}/facts`} className="font-semibold text-teal hover:underline">
              Confirm it on the facts page
            </Link>
          </p>
        ) : (
          <div key={c.key} className="space-y-1">
            <label htmlFor={`${id}-${c.key}`} className="block text-sm font-medium text-ink">
              {c.question}
            </label>
            <FactValueInput id={`${id}-${c.key}`} factKey={c.key} value={answers[c.key] ?? ''} onChange={(v) => setAnswers((a) => ({ ...a, [c.key]: v }))} />
          </div>
        ),
      )}
      {error ? <ErrorText>{error}</ErrorText> : null}
      {toAsk.length > 0 ? (
        <Button disabled={busy} onClick={() => void save()}>
          Save answers
        </Button>
      ) : null}
    </Card>
  );
}
