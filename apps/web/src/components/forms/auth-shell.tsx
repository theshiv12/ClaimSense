import type { ReactNode } from 'react';
import { CheckIcon } from '../ui/icons';

const POINTS = ['Payout estimate with the exact policy clause', 'Never shared with your insurer', 'Delete your data any time'];

/** Log in / sign up: teal brand panel beside the form (Figma 06, 07). */
export function AuthShell({ pitch, blurb, title, subtitle, children }: { pitch: string; blurb: string; title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="grid min-h-[calc(100vh-72px)] lg:grid-cols-[610px_1fr]">
      <section className="hidden flex-col justify-between bg-teal p-16 text-white lg:flex">
        <span />
        <div className="space-y-6">
          <p className="text-5xl font-bold leading-tight">{pitch}</p>
          <p className="text-lg text-white/85">{blurb}</p>
          <ul className="space-y-3">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-3">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/25"><CheckIcon /></span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-white/75">Estimate, not a guarantee. Only your insurer decides. Not medical or legal advice.</p>
      </section>
      <section className="flex items-center justify-center px-4 py-14">
        <div className="w-full max-w-[460px] rounded-2xl border border-border bg-white p-10">
          <h1 className="text-3xl font-bold text-ink">{title}</h1>
          <p className="mb-6 mt-1 text-sm text-muted">{subtitle}</p>
          {children}
        </div>
      </section>
    </main>
  );
}
