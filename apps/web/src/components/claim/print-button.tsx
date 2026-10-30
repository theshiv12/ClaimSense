'use client';
import { buttonClass } from '../ui/button';

/** FR-12: the browser's print dialog saves the summary as a PDF. Nothing is generated or stored on a server. */
export function PrintButton({ label = 'Download PDF' }: { label?: string }) {
  return (
    <button type="button" className={buttonClass('primary', 'print:hidden')} onClick={() => window.print()}>
      {label}
    </button>
  );
}
