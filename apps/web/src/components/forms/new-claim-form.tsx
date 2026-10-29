'use client';
import { CreateClaimInputSchema, type RoomCategory } from '@claimsense/shared';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { rupeesToPaise } from '@/lib/format';
import { ERROR_MESSAGES, ROOM_LABELS } from '@/lib/labels';
import { createClaim } from '@/server/actions/claims';
import { Button, ButtonLink } from '../ui/button';
import { Card } from '../ui/card';
import { ErrorText, Field, inputClass } from '../ui/field';

const str = (v: FormDataEntryValue | null) => (typeof v === 'string' ? v.trim() : '');

const RELATIONS = [['self', 'Me'], ['parent', 'Parent'], ['spouse', 'Spouse'], ['child', 'Child'], ['other', 'Someone else']] as const;

/** A checkbox drawn as a switch (Figma 02). The label stays a real <label>, so it is keyboard and screen-reader friendly. */
function Toggle({ name, defaultChecked, required, title, children }: { name: string; defaultChecked?: boolean; required?: boolean; title: string; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm">
      <span className="relative mt-0.5 h-6 w-10 shrink-0">
        <input type="checkbox" role="switch" aria-required={required ? true : undefined} name={name} defaultChecked={defaultChecked} className="peer absolute inset-0 z-10 cursor-pointer opacity-0" />
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-border transition after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:bg-teal peer-checked:after:translate-x-4 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-teal"
        />
      </span>
      <span>
        <strong className="block text-ink">{title}</strong>
        <span className="text-muted">{children}</span>
      </span>
    </label>
  );
}

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
      }}
      className="grid gap-5 lg:grid-cols-[520px_minmax(0,1fr)]"
      noValidate
    >
      <Card className="h-fit space-y-5 p-7">
        <h2 className="text-2xl font-bold text-ink">Before you upload</h2>
        <p className="text-sm text-muted">
          Your documents are read by Google Gemini (free tier) to extract facts, so the data leaves India. Google may use it to
          improve its products, and people may review it. Nothing is shared with your insurer.
        </p>
        <Toggle name="analysis" required title="Read my documents to estimate this claim (required).">
          This is a demo: upload only the sample or made-up documents. The file itself is never stored; only the facts read from it are.
        </Toggle>
        <Toggle name="retention" defaultChecked title="Keep my check for 7 days">
          So you can come back. Deleted automatically after that, or when you press “Delete my data”.
        </Toggle>
        <Toggle name="improve" title="Help improve ClaimSense">
          Use my anonymised results to check accuracy (optional).
        </Toggle>
        <p className="border-t border-border pt-4 text-xs text-muted">
          Estimate, not a guarantee. Only your insurer decides. Not medical or legal advice. ClaimSense is not IRDAI-registered.
        </p>
      </Card>

      <Card className="space-y-5 p-7">
        <h2 className="text-2xl font-bold text-ink">About the claim</h2>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink">Who is this claim for?</legend>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-bg p-1 sm:grid-cols-5">
            {RELATIONS.map(([v, l]) => (
              <label key={v} className="cursor-pointer">
                <input type="radio" name="relation" value={v} defaultChecked={v === 'self'} className="peer sr-only" />
                <span className="block rounded-lg px-3 py-2 text-center text-sm text-muted peer-checked:border peer-checked:border-border peer-checked:bg-white peer-checked:font-semibold peer-checked:text-ink peer-focus-visible:outline-2 peer-focus-visible:outline-teal">
                  {l}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <Field id={`${id}-plan`} label="Insurer and plan">
          <select id={`${id}-plan`} name="planId" className={inputClass}>
            {plans.map((p) => (
              <option key={p.planId} value={p.planId}>{p.name}</option>
            ))}
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`${id}-tr`} label="Planned treatment">
            <input id={`${id}-tr`} name="treatment" className={inputClass} placeholder="e.g. Knee replacement (right)" />
          </Field>
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
        {error ? <ErrorText>{error}</ErrorText> : null}
        <div className="flex items-center justify-between gap-3 pt-2">
          <ButtonLink href="/claims" variant="ghost">← Back</ButtonLink>
          <Button type="submit" disabled={busy}>
            Continue to documents
          </Button>
        </div>
      </Card>
    </form>
  );
}
