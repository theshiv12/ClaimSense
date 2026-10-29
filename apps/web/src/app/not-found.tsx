import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-2xl font-bold text-ink">Not found</h1>
      <p className="mt-2 text-sm text-muted">This page does not exist, or it is not yours to see.</p>
      <Link className="mt-6 inline-block text-sm font-semibold text-teal hover:underline" href="/claims">Go to my checks</Link>
    </main>
  );
}
