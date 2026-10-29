import type { ReactNode } from 'react';
import { StepBar, type Step } from './step-bar';

/** The strip under the header on a claim's pages: progress, who it is for, and page actions (Figma 02–05). */
export function ClaimBar({ step, claimId, subject, children }: { step: Step; claimId?: string; subject?: string; children?: ReactNode }) {
  const hrefs = claimId ? { upload: `/claims/${claimId}/facts`, facts: `/claims/${claimId}/facts`, estimate: `/claims/${claimId}` } : {};
  return (
    <div className="border-b border-border bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-10">
        <StepBar current={step} hrefs={hrefs} />
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
          {subject ? <span>{subject}</span> : null}
          {children}
        </div>
      </div>
    </div>
  );
}
