import type { ChatReplyView } from '@claimsense/shared';

/** One grounded answer with the sources it used (check chat, Explain my estimate). What-ifs are labelled. */
export function AnswerBubble({ reply }: { reply: ChatReplyView }) {
  return (
    <div className="max-w-[95%] space-y-2 rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink">
      {reply.kind === 'whatif' ? (
        <p className="w-fit rounded-full bg-warn-bg px-2 py-0.5 text-xs font-semibold text-warn-fg">What-if (not saved)</p>
      ) : null}
      <p className="whitespace-pre-line">
        <span className="sr-only">Answer:</span> {reply.answer}
      </p>
      {reply.citations.length > 0 ? (
        <ul className="flex flex-wrap gap-1" aria-label="Sources">
          {reply.citations.map((c) => (
            <li key={c.id} className="rounded-full border border-border bg-bg px-2 py-0.5 text-xs text-muted">
              {c.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
