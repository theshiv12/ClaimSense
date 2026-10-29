import type { ReactNode } from 'react';

export const inputClass =
  'w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30';

/** A label above its control; `htmlFor` ties them together for screen readers. */
export function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-lg bg-risk-bg px-3 py-2 text-sm text-risk-fg">
      {children}
    </p>
  );
}
