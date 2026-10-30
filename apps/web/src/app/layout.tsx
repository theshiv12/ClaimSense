import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { SiteHeader } from '@/components/site-header';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta' });

export const metadata: Metadata = {
  title: 'ClaimSense',
  description: 'Know what your health policy is likely to pay, before admission.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={jakarta.variable}>
      <body className="min-h-screen bg-bg font-sans text-ink antialiased">
        <SiteHeader />
        {children}
        <footer className="mx-auto max-w-[1440px] px-4 py-10 text-xs text-muted sm:px-10 print:hidden">
          ClaimSense is a self-help estimate, not an insurer, broker or TPA. It never files claims or sells policies.
        </footer>
      </body>
    </html>
  );
}
