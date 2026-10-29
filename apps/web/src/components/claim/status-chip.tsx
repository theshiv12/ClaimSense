import type { RuleOutcome } from '@claimsense/shared';
import { Chip, type Tone } from '../ui/chip';
import { CheckIcon, CrossIcon, MinusIcon, QuestionIcon } from '../ui/icons';

const STATUS: Record<RuleOutcome, { word: string; tone: Tone; Icon: () => React.JSX.Element }> = {
  pass: { word: 'Pass', tone: 'pass', Icon: CheckIcon },
  deduction: { word: 'Deduction', tone: 'warn', Icon: MinusIcon },
  fail: { word: 'Fail', tone: 'risk', Icon: CrossIcon },
  unknown: { word: 'Unknown', tone: 'neutral', Icon: QuestionIcon },
};

/** Icon and word together, never colour alone (apps/web/CLAUDE.md). */
export function StatusChip({ outcome }: { outcome: RuleOutcome }) {
  const { word, tone, Icon } = STATUS[outcome];
  return (
    <Chip tone={tone} icon={<Icon />}>
      {word}
    </Chip>
  );
}
