import Link from 'next/link';
import { currentUser } from '@/lib/api/server';
import { LogoutButton } from './forms/logout-button';
import { buttonClass } from './ui/button';
import { Brand } from './ui/brand';

export async function SiteHeader() {
  const user = await currentUser();
  return (
    <header className="border-b border-border bg-white">
      <nav className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-10" aria-label="Main">
        <Brand />
        <div className="flex items-center gap-5 text-sm">
          {user ? (
            <>
              <Link className="text-muted hover:text-ink" href="/claims">My claims</Link>
              {user.isGuest ? <Link className="text-muted hover:text-ink" href="/signup">Create account</Link> : null}
              {user.email ? <span className="hidden text-muted md:inline">{user.email}</span> : null}
              <LogoutButton label={user.isGuest ? 'End sample' : 'Log out'} />
            </>
          ) : (
            <>
              <Link className="hidden text-muted hover:text-ink sm:inline" href="/#how">How it works</Link>
              <Link className="hidden text-muted hover:text-ink sm:inline" href="/#privacy">Privacy</Link>
              <Link className="hidden text-muted hover:text-ink sm:inline" href="/#samples">Sample cases</Link>
              <Link className={buttonClass('secondary')} href="/login">Sign in</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
