'use client';
import { CreateClaimInputSchema, type RoomCategory } from '@claimsense/shared';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { rupeesToPaise } from '@/lib/format';
import { ERROR_MESSAGES, ROOM_LABELS } from '@/lib/labels';
import { createClaim } from '@/server/actions/claims';
import { Button } from '../ui/button';
import { ErrorText, Field, inputClass } from '../ui/field';

const str = (v: FormDataEntryValue | null) => (typeof v === 'string' ? v.trim() : '');

const RELATIONS = [['self', 'Myself'], ['spouse', 'Spouse'], ['parent', 'Parent'], ['child', 'Child'], ['other', 'Someone else']] as const;

/** 02 Setup + consent: one toggle per purpose, and the truth about the Gemini free tier. */
export function NewClaimForm({ plans }: { plans: { planId: string; name: string }[] }) {
  const id = useId();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (f: FormData) => {
    const rent = str(f.get('rent'));
    const category = str(f.get('category'));
    const input = {
      planId: f.get('planId'),
      subject: { relation: f.get('relation'), treatment: f.get('treatment') },
      consent: { analysis: f.get('analysis') === 'on', retention: f.get('retention') === 'on', improve: f.get('improve') === 'on' },
      admissionDate: f.get('admissionDate') || null,
      room: category && rent ? { category: category as RoomCategory, rentPerDayPaise: rupeesToPaise(rent) } : null,
    };
    const check = CreateClaimInputSchema.safeParse(input);
    if (!check.success) {
      setError(input.consent.analysis ? 'Please fill in who it is for and the treatment, and check the room rent.' : 'We need your consent to read your documents before we can check anything.');
      return;
    }
    setBusy(true);
    const r = await createClaim(check.data);
    setBusy(false);
    if (!r.ok) return setError(ERROR_MESSAGES[r.code]);
    router.push(`/claims/${r.data.claimId}/facts`);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit(new FormData(e.currentTarget));
      }} className="space-y-5" noValidate>
      <Field id={`${id}-plan`} label="Your policy">
        <select id={`${id}-plan`} name="planId" className={inputClass}>
          {plans.map((p) => (
            <option key={p.planId} value={p.planId}>{p.name}</option>
          ))}
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${id}-rel`} label="Who is being admitted?">
          <select id={`${id}-rel`} name="relation" className={inputClass} defaultValue="self">
            {RELATIONS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Field>
        <Field id={`${id}-tr`} label="Planned treatment">
          <input id={`${id}-tr`} name="treatment" className={inputClass} placeholder="e.g. Knee replacement" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id={`${id}-adm`} label="Planned admission (optional)">
          <input id={`${id}-adm`} name="admissionDate" type="date" className={inputClass} />
        </Field>
        <Field id={`${id}-cat`} label="Room type (optional)">
          <select id={`${id}-cat`} name="category" className={inputClass} defaultValue="">
            <option value="">Not decided</option>
            {(Object.keys(ROOM_LABELS) as RoomCategory[]).map((c) => (
              <option key={c} value={c}>{ROOM_LABELS[c]}</option>
            ))}
          </select>
        </Field>
        <Field id={`${id}-rent`} label="Room rent per day (₹)">
          <input id={`${id}-rent`} name="rent" inputMode="decimal" className={inputClass} placeholder="e.g. 7000" />
        </Field>
      </div>

      <fieldset className="space-y-3 rounded-xl border border-border bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-ink">Your consent</legend>
        <label className="flex items-start gap-2 text-sm text-ink">
          <input type="checkbox" name="analysis" className="mt-1" />
          <span>
            <strong>Read my documents to estimate this claim (required).</strong> Your documents are read by Google Gemini
            (free tier). Google may use them to improve its products, and people may review them. This is a demo: upload
            only the sample or made-up documents. The file itself is never stored; only the facts read from it are.
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm text-ink">
          <input type="checkbox" name="retention" defaultChecked className="mt-1" />
          <span>Keep the facts and estimate for 7 days so I can come back. They are deleted automatically after that, or when I press “Delete my data”.</span>
        </label>
        <label className="flex items-start gap-2 text-sm text-ink">
          <input type="checkbox" name="improve" className="mt-1" />
          <span>Use my anonymised results to improve ClaimSense (optional).</span>
        </label>
      </fieldset>
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button type="submit" disabled={busy}>
        Continue to documents
      </Button>
    </form>
  );
}
