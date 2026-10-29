/** Required on every result screen (apps/web/CLAUDE.md). */
export function Disclaimer() {
  return (
    <p className="rounded-lg border border-border bg-white px-4 py-3 text-xs text-muted">
      <strong className="text-ink">Estimate, not a guarantee. Only your insurer decides. Not medical or legal advice.</strong>{' '}
      ClaimSense reads your documents with AI, but the amounts come from fixed rules based on your policy wording.
    </p>
  );
}
