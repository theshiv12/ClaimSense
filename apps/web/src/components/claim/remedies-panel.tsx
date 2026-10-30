import type { Remedy } from '@claimsense/shared';
import { RULE_TITLES } from '@/lib/labels';

/**
 * What you can do, from config/remedies.json only (golden rule 10). `showRule` labels each remedy with its
 * check; inside one check's own "What can I do?" panel that label would only repeat the row's title.
 */
export function RemediesPanel({ remedies, showRule = true }: { remedies: Remedy[]; showRule?: boolean }) {
  if (remedies.length === 0) return <p className="text-sm text-muted">Nothing to fix: every check passed.</p>;
  return (
    <ul className="space-y-3">
      {remedies.map((r) => (
        <li key={r.id} className="rounded-lg bg-bg p-3">
          {showRule ? <p className="text-xs font-semibold uppercase tracking-wide text-muted">{RULE_TITLES[r.ruleId]}</p> : null}
          <p className="text-sm font-semibold text-ink">{r.title}</p>
          <p className="text-sm text-muted">{r.body}</p>
        </li>
      ))}
    </ul>
  );
}
