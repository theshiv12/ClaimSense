import type { ReactNode } from 'react';
import { openSample } from '@/server/actions/navigation';
import { buttonClass } from '../ui/button';

/** Samples start with a POST, so no link, crawler or prefetch can create one by accident. */
export function SampleButton({ caseId, children, variant = 'primary', className }: { caseId: string; children: ReactNode; variant?: 'primary' | 'secondary'; className?: string }) {
  return (
    <form action={openSample} className={className}>
      <input type="hidden" name="caseId" value={caseId} />
      <button type="submit" className={buttonClass(variant, 'w-full')}>
        {children}
      </button>
    </form>
  );
}
