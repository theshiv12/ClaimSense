import Link from 'next/link';

/** The ClaimSense mark and name (Figma top bar). `inverse` for the teal brand panel. */
export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 text-xl font-bold ${inverse ? 'text-white' : 'text-ink'}`}>
      <span aria-hidden className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm ${inverse ? 'bg-white text-teal' : 'bg-teal text-white'}`}>
        C
      </span>
      ClaimSense
    </Link>
  );
}
