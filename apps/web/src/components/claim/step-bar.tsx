import Link from 'next/link';
import { CheckIcon } from '../ui/icons';

export type Step = 'setup' | 'upload' | 'facts' | 'estimate';

const STEPS: { id: Step; label: string }[] = [
  { id: 'setup', label: 'Set up' },
  { id: 'upload', label: 'Upload' },
  { id: 'facts', label: 'Confirm facts' },
  { id: 'estimate', label: 'Estimate' },
];

/** Where you are in a check (Figma 02–04). Done steps carry an icon and a hidden word, never colour alone. */
export function StepBar({ current, hrefs = {}, pendingFacts = 0 }: { current: Step; hrefs?: Partial<Record<Step, string>>; pendingFacts?: number }) {
  const at = STEPS.findIndex((s) => s.id === current);
  return (
    <ol aria-label="Progress" className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
      {STEPS.map((s, i) => {
        // Facts are not "confirmed" while some still need the user, even past that step.
        const waiting = s.id === 'facts' && pendingFacts > 0 && i < at;
        const done = i < at && !waiting;
        const here = i === at;
        const label = (
          <span className={here ? 'font-semibold text-ink' : 'text-muted'}>
            {s.label}
            {done ? <span className="sr-only"> done</span> : null}
            {waiting ? <span className="ml-1 rounded-full bg-warn-bg px-2 py-0.5 text-xs font-semibold text-warn-fg">{`${pendingFacts} to confirm`}</span> : null}
          </span>
        );
        const href = hrefs[s.id];
        return (
          <li key={s.id} aria-current={here ? 'step' : undefined} className="flex items-center gap-2">
            {i > 0 ? <span aria-hidden className="hidden h-px w-8 bg-border sm:block" /> : null}
            <span
              aria-hidden
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                done ? 'bg-teal text-white' : here ? 'border-2 border-teal text-teal' : 'border border-border text-muted'
              }`}
            >
              {done ? <CheckIcon /> : i + 1}
            </span>
            {href && !here ? <Link href={href} className="hover:underline">{label}</Link> : label}
          </li>
        );
      })}
    </ol>
  );
}
