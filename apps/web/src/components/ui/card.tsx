import type { ReactNode } from 'react';

export function Card({ children, className = '', as: Tag = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'li' | 'article' }) {
  return <Tag className={`rounded-xl border border-border bg-white p-5 ${className}`}>{children}</Tag>;
}
