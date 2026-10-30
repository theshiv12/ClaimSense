'use client';
import { BillHead, FactKey, type ActionResult, type FactValue } from '@claimsense/shared';
import Link from 'next/link';
import { useId, useState } from 'react';
import * as api from '@/lib/api/client';
import { documentSummaries, toView, type StoredFactView, type WireFact } from '@/lib/fact-view';
import { ERROR_MESSAGES, FACT_LABELS, HEAD_LABELS } from '@/lib/labels';
import { buttonClass, Button } from '../ui/button';
import { Card } from '../ui/card';
import { Disclaimer } from './disclaimer';
import { Chip } from '../ui/chip';
import { ErrorText, Field, inputClass } from '../ui/field';
import { FactRow, type FactActions } from './fact-row';
import { FactValueInput, parseInput } from './fact-value-input';

type FactResult = Promise<ActionResult<{ fact: WireFact }>>;
type UploadResult = Promise<ActionResult<{ facts: WireFact[]; needsYou: number; warnings: string[] }>>;

interface Props {
  claimId: string;
  initial: StoredFactView[];
  /** Defaults to the REST API (lib/api/client); tests pass fakes. */
  actions?: FactActions & {
    add: (input: { claimId: string; key: FactKey; head: BillHead; value: FactValue }) => FactResult;
    upload: (form: FormData) => UploadResult;
  };
  /** From "What can I do?" (`?add=<key>`): open the manual form on this fact. Anything not a FactKey is ignored. */
  initialAddKey?: string;
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

const API_ACTIONS: NonNullable<Props['actions']> = {
  confirm: api.confirmFact,
  edit: api.editFact,
  add: api.addFact,
  upload: api.uploadAndExtract,
};

export function FactsBoard({ claimId, initial, actions = API_ACTIONS, initialAddKey }: Props) {
  const parsedAsk = FactKey.safeParse(initialAddKey);
  // A value read from a document and still waiting for the user's check is confirmed or corrected in place,
  // not overridden by a new user-stated value (Engine decision 13; golden rule 10).
  const pendingAsk = parsedAsk.success && initial.some((f) => f.key === parsedAsk.data && f.status === 'found' && !f.usable);
  const asked = pendingAsk ? { success: false as const } : parsedAsk;
  const id = useId();
  const [facts, setFacts] = useState(initial);
  const [notice, setNotice] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState(asked.success);
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState<FactKey>(asked.success ? asked.data : 'sum_insured');
  const [head, setHead] = useState<BillHead>('room');
  const [text, setText] = useState('');

  const needsYou = facts.filter((f) => f.status === 'found' && !f.usable).length;
  const ready = facts.filter((f) => f.usable).length;
  const docs = documentSummaries(facts);
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
    <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)_360px]">
      <aside className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Documents · {docs.length}</p>
        {docs.map((d) => (
          <Card key={d.id} as="div" className="space-y-2 p-4">
            <p className="text-sm font-semibold text-ink">Document {d.n}</p>
            {d.toConfirm > 0 ? <Chip tone="warn">{d.toConfirm} to confirm</Chip> : <Chip tone="pass">{d.found} {d.found === 1 ? 'fact' : 'facts'} found</Chip>}
          </Card>
        ))}
        <div className="space-y-3 rounded-xl border-2 border-dashed border-border p-4 text-center">
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
            className={buttonClass('primary', `w-full peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-teal ${busy ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`)}
          >
            {busy ? 'Reading…' : 'Upload a document'}
          </label>
          <p className="text-xs text-muted">Policy schedule and the hospital’s estimate. PDF, JPG, PNG · up to 4 MB each, 8 per check. Files are read, then discarded.</p>
          <Button variant="secondary" className="w-full" onClick={() => setManual((m) => !m)}>
            Enter facts yourself
          </Button>
        </div>
        {notice.map((n) => (
          <p key={n} className="rounded-lg bg-warn-bg px-3 py-2 text-sm text-warn-fg">{n}</p>
        ))}
        {error ? <ErrorText>{error}</ErrorText> : null}
      </aside>

      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-ink">Check what we found</h1>
            <p className="text-sm text-muted">The estimate uses only confirmed facts. Correct anything that’s wrong. We never guess.</p>
            {pendingAsk && parsedAsk.success ? (
              <p role="status" className="mt-2 rounded-lg bg-warn-bg px-3 py-2 text-sm text-warn-fg">
                {`${FACT_LABELS[parsedAsk.data]} was read from your document: confirm it or correct it below.`}
              </p>
            ) : null}
          </div>
          {needsYou > 0 ? <Chip tone="warn">{needsYou} need you</Chip> : <Chip tone="pass">All facts usable</Chip>}
        </div>

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

        <Card flush className="overflow-hidden">
          {facts.length === 0 ? (
            <p className="p-5 text-sm text-muted">No facts yet. Upload a document or enter them yourself.</p>
          ) : (
            <ul>
              {facts.map((f) => (
                <FactRow key={f.id} claimId={claimId} fact={f} actions={actions} onChange={replace} />
              ))}
            </ul>
          )}
        </Card>
      </div>

      <aside className="space-y-3">
        <Card className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Your estimate</p>
          <h2 className="text-xl font-bold text-ink">{needsYou > 0 ? `Confirm ${needsYou} ${needsYou === 1 ? 'fact' : 'facts'} first` : 'Ready when you are'}</h2>
          <p className="text-sm text-muted">
            {needsYou > 0
              ? 'Facts we could not verify count as Unknown until you confirm them. Facts read from photos need a quick check.'
              : 'The rules run only on the facts above.'}
          </p>
          {facts.length > 0 ? (
            <div className="space-y-1">
              <div className="h-2 overflow-hidden rounded-full bg-border">
                <div className="h-full bg-teal" style={{ width: `${Math.round((ready / facts.length) * 100)}%` }} />
              </div>
              <p className="text-sm text-muted">{ready} of {facts.length} facts ready</p>
            </div>
          ) : null}
          <Link href={`/claims/${claimId}`} className={buttonClass('primary', 'w-full')}>
            3. See the estimate
          </Link>
          {needsYou > 0 ? <p className="text-xs text-muted">Unconfirmed facts will show as Unknown.</p> : null}
        </Card>
        <Disclaimer />
      </aside>
    </div>
  );
}
