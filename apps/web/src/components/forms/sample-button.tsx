'use client';
import { useState, type ReactNode } from 'react';
import { startSample } from '@/lib/api/client';
import { buttonClass } from '../ui/button';

/** Samples start with a POST (never a link), so no crawler or prefetch can create one by accident. */
export function SampleButton({ caseId, children, variant = 'primary', className }: { caseId: string; children: ReactNode; variant?: 'primary' | 'secondary'; className?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        void startSample(caseId).then((r) => {
          setBusy(false);
          // A full load, so the header and every server component see the new session cookie.
          window.location.assign(r.ok ? `/claims/${r.data.claimId}` : r.code === 'RATE_LIMITED' ? '/?sample=busy' : '/');
        });
      }}
    >
      <button type="submit" disabled={busy} className={buttonClass(variant, 'w-full')}>
        {children}
      </button>
    </form>
  );
}
