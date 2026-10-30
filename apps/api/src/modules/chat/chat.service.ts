import { explain, LlmChatAnswerSchema, type ChatAskInput, type ChatReplyView, type ChatSource, type CurrentUserView, type RuleId } from '@claimsense/shared';
import { Types } from 'mongoose';
import { env } from '../../core/env';
import { fail } from '../../core/errors';
import { ChatUsage } from '../../core/models';
import { getLlm, LlmError } from '../../integrations/llm';
import { estimateView } from '../estimate/estimate.service';

// "Ask about this check" (ADR-010): grounded Q&A. The model may only explain the numbered sources built here;
// every answer is checked in code before it reaches the user (golden rules 1 and 10). Nothing is stored.

const DISCLAIMER = 'Estimate, not a guarantee. Only your insurer decides. Not medical or legal advice.';
const SAFE_REPLY =
  'I can only explain what is in your policy, your documents and this check. For the amounts, see the estimate above; only your insurer decides.';
const HIDE_REFUSAL =
  "I can't help hide or change medical facts. A false or missing disclosure can get the claim rejected and the policy cancelled. The steps above are what you can do.";

// Asking to hide, leave out, change or back-date facts (English and common Hinglish): refused before any AI call.
const HIDE_INTENT =
  /\b(hide|conceal|cover up|not (mention|tell|disclose|declare)|don'?t (mention|tell|disclose|declare)|without (telling|mentioning|disclosing)|lie|fake|forge|back-?date|change (the )?(date|diagnosis|records?|report)|chhupa\w*|chupa\w*|jhooth\w*|jhoot\w*)\b/i;

/** Amounts and percentages written in a text, as digits only ("₹2,05,800" → "205800"). */
const numbersIn = (text: string) =>
  [...text.matchAll(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)|([\d,]*\d(?:\.\d+)?)\s*%/gi)].map((m) => (m[1] ?? m[2] ?? '').replace(/,/g, ''));

/** One counter per user per UTC day, bumped atomically before the model is called; refunded if it fails. */
const takeChatQuota = async (userId: Types.ObjectId) => {
  const day = new Date().toISOString().slice(0, 10);
  const doc = await ChatUsage.findOneAndUpdate(
    { userId, day },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) } },
    { upsert: true, returnDocument: 'after' },
  ).lean();
  const ok = (doc?.count ?? 1) <= env().AI_DAILY_CHATS_PER_USER;
  const refund = () => ChatUsage.updateOne({ userId, day }, { $inc: { count: -1 } });
  if (!ok) await refund();
  return { ok, refund };
};

const reply = (answer: string, refused: boolean, citations: ChatReplyView['citations'] = []): ChatReplyView => ({
  answer: `${answer}\n\n${DISCLAIMER}`,
  refused,
  citations,
});

export const askAboutCheck = async (user: CurrentUserView, claimId: string, ruleId: RuleId, input: ChatAskInput): Promise<ChatReplyView> => {
  // Guests (samples) promise "no AI call" and are free to create, so the free AI quota is for accounts only.
  if (user.isGuest) return fail('AUTH_REQUIRED');
  const view = await estimateView(user.id, claimId); // owner-scoped: NOT_FOUND for anyone else's claim
  const result = view.estimate.results.find((r) => r.ruleId === ruleId);
  if (!result || result.outcome === 'pass') return fail('NOT_FOUND');

  if (HIDE_INTENT.test(input.question)) {
    console.info(`[chat] rule=${ruleId} refused=true cited=0 guard=hide`);
    return reply(HIDE_REFUSAL, true);
  }

  const sources: ChatSource[] = [
    { id: 'S-REASON', kind: 'reason', label: 'This check', text: explain(result) },
    ...(result.clause
      ? [{ id: 'S-CLAUSE', kind: 'clause' as const, label: `Clause ${result.clause.clauseId}, page ${result.clause.page}`, text: result.clause.quote }]
      : []),
    ...(view.evidence[ruleId] ?? []).map((l, i) => ({
      id: `S-DOC-${i + 1}`,
      kind: 'document' as const,
      label: l.page ? `Your document, page ${l.page}` : 'Your document',
      text: l.quote,
    })),
    ...view.remedies
      .filter((m) => m.ruleId === ruleId && m.outcome === result.outcome)
      .map((m) => ({ id: `S-REM-${m.id}`, kind: 'remedy' as const, label: m.title, text: m.body })),
    ...(view.precedents[ruleId] ?? []).map((c) => ({ id: `S-CASE-${c.id}`, kind: 'case' as const, label: c.title, text: `${c.citation}. ${c.summary}` })),
  ];

  const quota = await takeChatQuota(new Types.ObjectId(user.id));
  if (!quota.ok) return fail('AI_QUOTA_EXCEEDED');
  let raw: unknown;
  try {
    raw = await (await getLlm()).answer({ sources, question: input.question, history: input.history });
  } catch (err) {
    await quota.refund(); // the model did not answer, so the user keeps the try
    return fail(err instanceof LlmError ? err.code : 'LLM_UNAVAILABLE');
  }
  const parsed = LlmChatAnswerSchema.safeParse(raw);
  if (!parsed.success) return fail('LLM_OUTPUT_INVALID');

  // Checked in code, never trusted: no amount the sources do not contain, never "approved" (golden rules 1, 10).
  const sourceNumbers = new Set(sources.flatMap((s) => numbersIn(s.text)));
  const inventsAmount = numbersIn(parsed.data.answer).some((n) => !sourceNumbers.has(n));
  if (inventsAmount || /\bapprov/i.test(parsed.data.answer)) {
    console.info(`[chat] rule=${ruleId} refused=true cited=0 guard=output`);
    return reply(SAFE_REPLY, true);
  }
  const byId = new Map(sources.map((s) => [s.id, s]));
  const citations = [...new Set(parsed.data.citations)].flatMap((id) => {
    const s = byId.get(id);
    return s ? [{ id: s.id, label: s.label, kind: s.kind }] : [];
  });
  console.info(`[chat] rule=${ruleId} refused=${parsed.data.refused} cited=${citations.length}`);
  return reply(parsed.data.answer.trim(), parsed.data.refused, citations);
};
