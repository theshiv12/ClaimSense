import Link from 'next/link';
import { currentUser } from '@/server/auth';
import { logoutAndGoHome } from '@/server/actions/navigation';

export async function SiteHeader() {
  const user = await currentUser().catch(() => null);
  return (
    <header className="border-b border-border bg-white">
      <nav className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3" aria-label="Main">
        <Link href="/" className="text-lg font-bold text-teal">ClaimSense</Link>
        <div className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <Link className="text-ink hover:text-teal" href="/claims">My checks</Link>
              {user.isGuest ? <Link className="text-ink hover:text-teal" href="/signup">Create account</Link> : null}
              <form action={logoutAndGoHome}>
                <button type="submit" className="text-muted hover:text-ink">{user.isGuest ? 'End sample' : 'Log out'}</button>
              </form>
            </>
          ) : (
            <>
              <Link className="text-ink hover:text-teal" href="/login">Sign in</Link>
              <Link className="font-semibold text-teal" href="/signup">Create account</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
