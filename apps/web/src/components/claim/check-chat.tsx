'use client';
import type { ActionResult, ChatReplyView, RuleResult } from '@claimsense/shared';
import Link from 'next/link';
import { useId, useState } from 'react';
import { askAboutCheck } from '@/lib/api/client';
import { ERROR_MESSAGES } from '@/lib/labels';
import { Button, buttonClass } from '../ui/button';
import { ErrorText, inputClass } from '../ui/field';

type Ask = (input: { claimId: string; ruleId: string; question: string; history: { q: string; a: string }[] }) => Promise<ActionResult<ChatReplyView>>;
type Outcome = Exclude<RuleResult['outcome'], 'pass'>;

// Suggested questions per outcome: a fixed list, so the chat starts from what the check can answer.
const SUGGESTED: Record<Outcome, string[]> = {
  deduction: ['Why was this cut?', 'Which clause is this?', 'What happened in similar cases?'],
  fail: ['Why does this check fail?', 'Which clause is this?', 'What happened in similar cases?'],
  unknown: ['What do you still need from me?', 'Which clause is this?', 'What happened in similar cases?'],
};
const MAX_TURNS = 4;

/**
 * "Ask about this check" (ADR-010): grounded Q&A. The API answers only from this check's reason, clause, the
 * user's own document lines, catalog remedies and reviewed cases, and says which ones it used.
 */
export function CheckChat({ claimId, ruleId, outcome, ask = askAboutCheck }: { claimId: string; ruleId: string; outcome: Outcome; ask?: Ask }) {
  const id = useId();
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<{ q: string; reply: ChatReplyView }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [needsAccount, setNeedsAccount] = useState(false);
  const [busy, setBusy] = useState(false);

  const send = async (q: string) => {
    const text = q.trim();
    if (text.length < 2 || busy) return;
    setBusy(true);
    setError(null);
    const history = turns.slice(-MAX_TURNS).map((t) => ({ q: t.q, a: t.reply.answer }));
    const r = await ask({ claimId, ruleId, question: text, history });
    setBusy(false);
    if (r.ok) {
      setTurns((all) => [...all, { q: text, reply: r.data }].slice(-MAX_TURNS));
      setQuestion('');
    } else if (r.code === 'AUTH_REQUIRED') setNeedsAccount(true);
    else setError(ERROR_MESSAGES[r.code]);
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-ink">Ask about this check</h4>
      <div className="flex flex-wrap gap-2">
        {SUGGESTED[outcome].map((s) => (
          <button key={s} type="button" disabled={busy} onClick={() => void send(s)} className="rounded-full bg-bg px-3 py-1 text-xs font-semibold text-ink hover:bg-border disabled:opacity-50">
            {s}
          </button>
        ))}
      </div>

      {turns.length > 0 ? (
        <ol className="space-y-3" aria-live="polite">
          {turns.map((t, i) => (
            <li key={`${i}-${t.q}`} className="space-y-2">
              <p className="ml-auto w-fit max-w-[90%] rounded-lg bg-teal px-3 py-2 text-sm text-white">{t.q}</p>
              <div className="max-w-[95%] space-y-2 rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink">
                <p className="whitespace-pre-line">{t.reply.answer}</p>
                {t.reply.citations.length > 0 ? (
                  <ul className="flex flex-wrap gap-1" aria-label="Sources">
                    {t.reply.citations.map((c) => (
                      <li key={c.id} className="rounded-full border border-border bg-bg px-2 py-0.5 text-xs text-muted">
                        {c.label}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      ) : null}

      {needsAccount ? (
        <p className="rounded-lg bg-bg px-3 py-2 text-sm text-ink">
          Create an account to ask about your own checks. Samples never call the AI.{' '}
          <Link href="/signup" className={buttonClass('ghost', 'px-0')}>Create an account</Link>
        </p>
      ) : null}
      {error ? <ErrorText>{error}</ErrorText> : null}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send(question);
        }}
      >
        <label htmlFor={`${id}-q`} className="sr-only">Ask about this check</label>
        <input
          id={`${id}-q`}
          value={question}
          maxLength={500}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask in English or Hinglish…"
          className={inputClass}
        />
        <Button type="submit" disabled={busy}>Ask</Button>
      </form>
      <p className="text-xs text-muted">
        Your question and this check’s details (not your files) are sent to Google Gemini (free tier) to answer it. Answers explain your
        policy; the amounts always come from the estimate above.
      </p>
    </div>
  );
}
