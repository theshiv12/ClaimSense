import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-teal text-white hover:opacity-90',
  secondary: 'border border-border bg-white text-ink hover:bg-bg',
  danger: 'border border-risk-fg/30 bg-white text-risk-fg hover:bg-risk-bg',
  ghost: 'text-teal underline-offset-2 hover:underline',
};

export const buttonClass = (variant: Variant = 'primary', extra = '') =>
  `inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${extra}`;

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type="button" className={buttonClass(variant, className)} {...props} />;
}

export function ButtonLink({ href, variant = 'primary', children, prefetch }: { href: string; variant?: Variant; children: ReactNode; prefetch?: boolean }) {
  return (
    <Link href={href} className={buttonClass(variant)} prefetch={prefetch}>
      {children}
    </Link>
  );
}
