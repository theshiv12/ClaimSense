import type { Precedent } from '@claimsense/shared';
import { formatDate } from '@/lib/format';
import { Chip, type Tone } from '../ui/chip';
import { CheckIcon, CrossIcon, MinusIcon } from '../ui/icons';

const FORUM: Record<Precedent['forum'], string> = {
  ombudsman: 'Insurance Ombudsman',
  irdai: 'IRDAI',
  consumer_court: 'Consumer court',
};

// Icon and word together, never colour alone (apps/web/CLAUDE.md).
const RESULT: Record<Precedent['result'], { word: string; tone: Tone; Icon: () => React.JSX.Element }> = {
  complainant_won: { word: 'Decided for the policyholder', tone: 'pass', Icon: CheckIcon },
  partly_allowed: { word: 'Partly allowed', tone: 'warn', Icon: MinusIcon },
  insurer_upheld: { word: 'Insurer’s decision upheld', tone: 'risk', Icon: CrossIcon },
};

/** Reviewed public decisions on the same kind of check (config/precedents.json, ADR-010). Never invented. */
export function SimilarCases({ cases }: { cases: Precedent[] }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-ink">Similar cases</h4>
      {cases.length === 0 ? (
        <p className="text-xs text-muted">No reviewed cases yet for this check. We only show decisions a person has checked against the source.</p>
      ) : (
        <ul className="space-y-2">
          {cases.map((c) => {
            const { word, tone, Icon } = RESULT[c.result];
            return (
              <li key={c.id} className="space-y-1 rounded-lg bg-bg p-3 text-sm">
                <p className="text-xs text-muted">{`${FORUM[c.forum]} · ${formatDate(c.decisionDate)}`}</p>
                <p className="font-semibold text-ink">{c.title}</p>
                <Chip tone={tone} icon={<Icon />}>
                  {word}
                </Chip>
                <p className="text-muted">{c.summary}</p>
                <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-teal hover:underline">
                  Read the decision ({c.citation})
                </a>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs text-muted">Past decisions do not bind your insurer; each claim is decided on its own facts.</p>
    </div>
  );
}
