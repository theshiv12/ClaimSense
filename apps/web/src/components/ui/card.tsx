import type { ReactNode } from 'react';

/** `flush` drops the padding, for lists whose rows run edge to edge (Figma 04 checks). */
export function Card({ children, className = '', as: Tag = 'section', flush = false }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'li' | 'article'; flush?: boolean }) {
  return <Tag className={`rounded-xl border border-border bg-white ${flush ? '' : 'p-5'} ${className}`}>{children}</Tag>;
}
