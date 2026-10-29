import type { ReactNode } from 'react';

export type Tone = 'pass' | 'warn' | 'risk' | 'neutral';

const TONES: Record<Tone, string> = {
  pass: 'bg-pass-bg text-pass-fg',
  warn: 'bg-warn-bg text-warn-fg',
  risk: 'bg-risk-bg text-risk-fg',
  neutral: 'bg-bg text-muted border border-border',
};

/** A status pill. Pass an icon and a word: status is never shown by colour alone. */
export function Chip({ tone, icon, children }: { tone: Tone; icon?: ReactNode; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}>
      {icon}
      {children}
    </span>
  );
}
