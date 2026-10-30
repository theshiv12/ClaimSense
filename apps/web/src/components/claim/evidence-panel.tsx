import type { RuleResult } from '@claimsense/shared';
import type { EvidenceLine } from '@claimsense/shared';
import { explain, FACT_LABELS, RULE_TITLES } from '@/lib/labels';

/** Why a check came out this way: the plan clause and the document lines the engine used (Figma 04; see lib/evidence). */
export function EvidencePanel({ result, lines }: { result: RuleResult; lines: (EvidenceLine & { usable?: boolean })[] }) {
  const { clause } = result;
  // The server already sends only facts the engine used; a line marked unusable is still never shown.
  const shown = lines.filter((l) => l.usable !== false);
  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-ink">Evidence · {RULE_TITLES[result.ruleId]}</h3>
      {clause ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {clause.source === 'regulation' ? `From the regulation · p.${clause.page}` : `From your policy · p.${clause.page}`}
          </p>
          <blockquote className="border-l-4 border-teal bg-bg px-4 py-3 text-sm text-ink">
            “{clause.quote}” <span className="text-muted">· Clause {clause.clauseId}</span>
          </blockquote>
        </div>
      ) : null}
      {shown.map((l) => (
        <div key={`${l.key}-${l.quote}`} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{l.page ? `From your documents · p.${l.page}` : 'From your documents'}</p>
          <blockquote className="border-l-4 border-cut bg-bg px-4 py-3 text-sm text-ink">
            “{l.quote}” <span className="text-muted">· {FACT_LABELS[l.key]}</span>
          </blockquote>
        </div>
      ))}
      <p className="text-sm text-muted">{explain(result)}</p>
    </div>
  );
}
