import type { Remedy } from '@claimsense/shared';
import { RULE_TITLES } from '@/lib/labels';

/** What you can do, from config/remedies.json only (golden rule 10). */
export function RemediesPanel({ remedies }: { remedies: Remedy[] }) {
  if (remedies.length === 0) return <p className="text-sm text-muted">Nothing to fix: every check passed.</p>;
  return (
    <ul className="space-y-3">
      {remedies.map((r) => (
        <li key={r.id} className="rounded-lg bg-bg p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{RULE_TITLES[r.ruleId]}</p>
          <p className="text-sm font-semibold text-ink">{r.title}</p>
          <p className="text-sm text-muted">{r.body}</p>
        </li>
      ))}
    </ul>
  );
}
