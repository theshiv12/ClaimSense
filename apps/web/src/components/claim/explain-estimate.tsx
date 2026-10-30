'use client';
import type { ActionResult, ChatReplyView } from '@claimsense/shared';
import Link from 'next/link';
import { useState } from 'react';
import { explainEstimate } from '@/lib/api/client';
import { ERROR_MESSAGES } from '@/lib/labels';
import { Button, buttonClass } from '../ui/button';
import { ErrorText } from '../ui/field';
import { AnswerBubble } from './answer-bubble';

type Explain = (input: { claimId: string }) => Promise<ActionResult<ChatReplyView>>;

/**
 * FR-11 (ADR-011): the whole estimate in plain words, by Gemini from the engine's own sentences and amounts,
 * checked in code like the check chat. Uses one of the day's AI tries.
 */
export function ExplainEstimate({ claimId, explain = explainEstimate }: { claimId: string; explain?: Explain }) {
  const [reply, setReply] = useState<ChatReplyView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsAccount, setNeedsAccount] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    setError(null);
    const r = await explain({ claimId });
    setBusy(false);
    if (r.ok) setReply(r.data);
    else if (r.code === 'AUTH_REQUIRED') setNeedsAccount(true);
    else setError(ERROR_MESSAGES[r.code]);
  };

  return (
    <div className="space-y-3">
      <Button variant="secondary" disabled={busy} onClick={() => void run()}>
        Explain my estimate in simple words
      </Button>
      <p role="status" className="sr-only">
        {busy ? 'Thinking…' : ''}
      </p>
      {reply ? <AnswerBubble reply={reply} /> : null}
      {needsAccount ? (
        <p role="alert" className="rounded-lg bg-bg px-3 py-2 text-sm text-ink">
          Create an account to get an explanation of your own estimate. Samples never call the AI.{' '}
          <Link href="/signup" className={buttonClass('ghost', 'px-0')}>Create an account</Link>
        </p>
      ) : null}
      {error ? <ErrorText>{error}</ErrorText> : null}
    </div>
  );
}
