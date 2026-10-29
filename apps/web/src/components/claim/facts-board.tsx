'use client';
import { BillHead, FactKey, type ActionResult, type FactValue } from '@claimsense/shared';
import Link from 'next/link';
import { useId, useState } from 'react';
import { toView, type StoredFactView, type WireFact } from '@/lib/fact-view';
import { ERROR_MESSAGES, FACT_LABELS, HEAD_LABELS } from '@/lib/labels';
import { buttonClass, Button } from '../ui/button';
import { Card } from '../ui/card';
import { Chip } from '../ui/chip';
import { ErrorText, Field, inputClass } from '../ui/field';
import { FactRow, type FactActions } from './fact-row';
import { FactValueInput, parseInput } from './fact-value-input';

type FactResult = Promise<ActionResult<{ fact: WireFact }>>;
type UploadResult = Promise<ActionResult<{ facts: WireFact[]; needsYou: number; warnings: string[] }>>;

interface Props {
  claimId: string;
  initial: StoredFactView[];
  actions: FactActions & {
    add: (input: { claimId: string; key: FactKey; head: BillHead; value: FactValue }) => FactResult;
    upload: (form: FormData) => UploadResult;
  };
}

const MAX_BYTES = 4 * 1024 * 1024;
const MAX_SIDE = 2000;

/** Photos are resized in the browser (longest side ≤ 2000 px) to stay under the 4 MB limit. */
const shrinkImage = async (file: File): Promise<Blob> => {
  if (!file.type.startsWith('image/')) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= MAX_BYTES) return file;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', 0.85));
};

const WARNINGS: Record<string, string> = {
  DOCUMENT_HAS_INSTRUCTIONS: 'This document contains text addressed to an AI. We ignored it, and every fact from it needs your check.',
  SOME_FACTS_DROPPED: 'Some values could not be read and were left out.',
  NO_TEXT_LAYER: 'This is a photo or scan, so quotes cannot be checked automatically. Please confirm each fact.',
};

export function FactsBoard({ claimId, initial, actions }: Props) {
  const id = useId();
  const [facts, setFacts] = useState(initial);
  const [notice, setNotice] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState<FactKey>('sum_insured');
  const [head, setHead] = useState<BillHead>('room');
  const [text, setText] = useState('');

  const needsYou = facts.filter((f) => f.status === 'found' && !f.usable).length;
  const replace = (f: StoredFactView) => setFacts((all) => all.map((x) => (x.id === f.id ? f : x)));

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setNotice([]);
    const blob = await shrinkImage(file);
    if (blob.size > MAX_BYTES) return setError(ERROR_MESSAGES.FILE_TOO_LARGE);
    const form = new FormData();
    form.set('claimId', claimId);
    form.set('file', blob, 'document');
    setBusy(true);
    const r = await actions.upload(form);
    setBusy(false);
    if (!r.ok) {
      setError(ERROR_MESSAGES[r.code]);
      if (r.code === 'LLM_UNAVAILABLE' || r.code === 'AI_QUOTA_EXCEEDED' || r.code === 'LLM_OUTPUT_INVALID') setManual(true);
      return;
    }
    setFacts((all) => [...all, ...r.data.facts.map(toView)]);
    setNotice(r.data.warnings.map((w) => WARNINGS[w] ?? w));
  };

  const add = async () => {
    const value = parseInput(key, text);
    if (value === null) return setError('Please enter a value.');
    const r = await actions.add({ claimId, key, head: key === 'bill_line_item' ? head : 'none', value });
    if (!r.ok) return setError(ERROR_MESSAGES[r.code]);
    setFacts((all) => [...all, toView(r.data.fact)]);
    setText('');
    setError(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-semibold text-ink">1. Add your documents</h2>
        <p className="mt-1 text-sm text-muted">Policy schedule and the hospital’s estimate. PDF, JPEG or PNG, up to 4 MB each, 8 per check.</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            id={`${id}-file`}
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            className="peer sr-only"
            disabled={busy}
            onChange={(e) => {
              void upload(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <label
            htmlFor={`${id}-file`}
            aria-disabled={busy}
            className={buttonClass('primary', `peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-teal ${busy ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`)}
          >
            {busy ? 'Reading…' : 'Upload a document'}
          </label>
          <Button variant="secondary" onClick={() => setManual((m) => !m)}>
            Enter facts yourself
          </Button>
        </div>
        {notice.map((n) => (
          <p key={n} className="mt-3 rounded-lg bg-warn-bg px-3 py-2 text-sm text-warn-fg">{n}</p>
        ))}
        {error ? <div className="mt-3"><ErrorText>{error}</ErrorText></div> : null}
      </Card>

      {manual ? (
        <Card>
          <h2 className="text-lg font-semibold text-ink">Enter a fact</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
            <Field id={`${id}-key`} label="What">
              <select id={`${id}-key`} className={inputClass} value={key} onChange={(e) => { setKey(e.target.value as FactKey); setText(''); }}>
                {FactKey.options.map((k) => (
                  <option key={k} value={k}>{FACT_LABELS[k]}</option>
                ))}
              </select>
            </Field>
            {key === 'bill_line_item' ? (
              <Field id={`${id}-head`} label="Bill head">
                <select id={`${id}-head`} className={inputClass} value={head} onChange={(e) => setHead(e.target.value as BillHead)}>
                  {BillHead.options.filter((h) => h !== 'none').map((h) => (
                    <option key={h} value={h}>{HEAD_LABELS[h]}</option>
                  ))}
                </select>
              </Field>
            ) : <div />}
            <Field id={`${id}-val`} label="Value">
              <FactValueInput id={`${id}-val`} factKey={key} value={text} onChange={setText} />
            </Field>
            <Button onClick={() => void add()}>Add</Button>
          </div>
        </Card>
      ) : null}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-ink">2. Check the facts</h2>
          {needsYou > 0 ? <Chip tone="warn">{needsYou} {needsYou === 1 ? 'fact needs' : 'facts need'} you</Chip> : <Chip tone="pass">All facts usable</Chip>}
        </div>
        <p className="mt-1 text-sm text-muted">A fact marked “Please check” counts as unknown until you confirm or correct it. We never guess.</p>
        {facts.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No facts yet. Upload a document or enter them yourself.</p>
        ) : (
          <ul className="mt-2">
            {facts.map((f) => (
              <FactRow key={f.id} claimId={claimId} fact={f} actions={actions} onChange={replace} />
            ))}
          </ul>
        )}
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/claims/${claimId}`} className={buttonClass('primary')}>
          3. See the estimate
        </Link>
        {needsYou > 0 ? <p className="text-sm text-muted">Unconfirmed facts will show as Unknown.</p> : null}
      </div>
    </div>
  );
}
