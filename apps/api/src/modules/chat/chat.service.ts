import { simulateFacts, toClaimFacts } from '@claimsense/rules';
import {
  explain,
  FACT_LABELS,
  formatDate,
  formatInr,
  LlmChatAnswerSchema,
  RULE_TITLES,
  type ChatAskInput,
  type ChatReplyView,
  type ChatSource,
  type CurrentUserView,
  type Estimate,
  type EstimateView,
  type LlmChatAnswer,
  type RuleId,
  type RuleResult,
} from '@claimsense/shared';
import { Types } from 'mongoose';
import { env } from '../../core/env';
import { fail } from '../../core/errors';
import { ChatUsage } from '../../core/models';
import { listFacts } from '../../core/scope';
import { getLlm, LlmError } from '../../integrations/llm';
import { getPlan } from '../../lib/plans';
import { estimateView } from '../estimate/estimate.service';
import { parseWhatIf, type WhatIfRequest } from '../whatif/parse';
import { asksToHide, vetAnswer } from './vet';

// "Ask about this check" (ADR-010) and what-ifs (FR-17, ADR-011). The model may only explain the numbered sources
// built here; every answer is checked in code before it reaches the user (golden rules 1 and 10). What-ifs and
// hide requests never reach the model: the engine and fixed text answer them. Nothing is stored.

const DISCLAIMER = 'Estimate, not a guarantee. Only your insurer decides. Not medical or legal advice.';
export const SAFE_REPLY =
  'I can only explain what is in your policy, your documents and this check. For the amounts, see the estimate above; only your insurer decides.';
export const HIDE_REFUSAL =
  "I can't help hide or change medical facts. A false or missing disclosure can get the claim rejected and the policy cancelled. The steps above are what you can do.";

export const VERDICT_WORDS: Record<Estimate['verdict'], string> = {
  likely_payable: 'Likely paid in full',
  likely_partial: 'Likely partly paid',
  at_risk: 'At risk',
};
const OUTCOME_WORDS: Record<RuleResult['outcome'], string> = { pass: 'Pass', deduction: 'Deduction', fail: 'Fail', unknown: 'Unknown' };

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

export const reply = (answer: string, refused: boolean, citations: ChatReplyView['citations'] = [], kind: ChatReplyView['kind'] = 'answer'): ChatReplyView => ({
  answer: `${answer}\n\n${DISCLAIMER}`,
  refused,
  kind,
  citations,
});

/** The model's raw output → what the user may see: Zod, the allow-list checks (vet.ts), known citations only. */
export const finalize = (raw: LlmChatAnswer, sources: ChatSource[]): ChatReplyView => {
  if (!vetAnswer(raw.answer, sources)) return reply(SAFE_REPLY, true);
  const byId = new Map(sources.map((s) => [s.id, s]));
  const citations = [...new Set(raw.citations)].flatMap((id) => {
    const s = byId.get(id);
    return s ? [{ id: s.id, label: s.label, kind: s.kind }] : [];
  });
  return reply(raw.answer.trim(), raw.refused, citations);
};

/** Hiding or changing facts, in the question or the browser's history (untrusted too): refused without the model. */
export const refusesToHide = (input: ChatAskInput) => [input.question, ...input.history.map((t) => t.q)].some(asksToHide);

/** Quota → model → finalize. Shared by the check chat and "Explain my estimate" (FR-11). */
export const runGrounded = async (user: CurrentUserView, sources: ChatSource[], input: ChatAskInput, tag: string): Promise<ChatReplyView> => {
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
  if (!parsed.success) {
    await quota.refund(); // an unusable answer is not the user's fault, as when gemini.ts cannot parse it
    return fail('LLM_OUTPUT_INVALID');
  }
  const out = finalize(parsed.data, sources);
  console.info(`[chat] ${tag} refused=${out.refused} cited=${out.citations.length}${out.refused && !parsed.data.refused ? ' guard=output' : ''}`);
  return out;
};

/** The sources for one check: its reason, clause, the user's document lines, catalog remedies, reviewed cases. */
export const checkSources = (view: Pick<EstimateView, 'evidence' | 'remedies' | 'precedents'>, result: RuleResult): ChatSource[] => [
  { id: 'S-REASON', kind: 'reason', label: 'This check', text: explain(result) },
  ...(result.clause
    ? [{ id: 'S-CLAUSE', kind: 'clause' as const, label: `Clause ${result.clause.clauseId}, page ${result.clause.page}`, text: result.clause.quote }]
    : []),
  ...(view.evidence[result.ruleId] ?? []).map((l, i) => ({
    id: `S-DOC-${i + 1}`,
    kind: 'document' as const,
    label: l.page ? `Your document, page ${l.page}` : 'Your document',
    text: l.quote,
  })),
  ...view.remedies
    .filter((m) => m.ruleId === result.ruleId && m.outcome === result.outcome)
    .map((m) => ({ id: `S-REM-${m.id}`, kind: 'remedy' as const, label: m.title, text: m.body })),
  ...(view.precedents[result.ruleId] ?? []).map((c) => ({ id: `S-CASE-${c.id}`, kind: 'case' as const, label: c.title, text: `${c.citation}. ${c.summary}` })),
];

const amounts = (e: Estimate) => `${formatInr(e.payablePaise)} of ${formatInr(e.claimedPaise)} likely paid, you pay ${formatInr(e.outOfPocketPaise)}`;

const TRUE_ONLY = 'This only applies if it is true: a false cause or disclosure can get the claim rejected and the policy cancelled.';
const MEDICAL_FIRST = 'Medical advice comes first: never delay treatment your doctor says you need because of cover.';
const WAITS: RuleId[] = ['R2', 'R3', 'R4'];

/** FR-17: the engine's answer to one hypothetical change, in fixed words. The model is never asked. */
export const whatIfText = (before: Estimate, after: Estimate, req: WhatIfRequest, patch: WhatIfRequest['patch'] = req.patch): string => {
  const same = before.payablePaise === after.payablePaise && before.claimedPaise === after.claimedPaise && before.verdict === after.verdict;
  const changed = after.results.filter((r) => before.results.find((b) => b.ruleId === r.ruleId)?.outcome !== r.outcome);
  const label = req.afterWait && patch.admissionDate ? `admission on ${formatDate(patch.admissionDate)} (when the waiting period ends)` : req.label;
  return [
    `What if ${label}: ${same ? `No change: ${amounts(after)}.` : `${amounts(after)} (now ${amounts(before)}). ${VERDICT_WORDS[after.verdict]}.`}`,
    ...(changed.length > 0 ? [`Checks that change: ${changed.map((r) => `${RULE_TITLES[r.ruleId]} → ${OUTCOME_WORDS[r.outcome]}`).join('; ')}.`] : []),
    ...(patch.room ? ['Assumes other charges stay the same.'] : []),
    ...(patch.isAccident !== undefined || patch.pedDisclosed !== undefined ? [TRUE_ONLY] : []),
    ...(patch.admissionDate ? [MEDICAL_FIRST] : []),
    'A what-if only: nothing is saved.',
  ].join(' ');
};

const answerWhatIf = async (user: CurrentUserView, claimId: string, view: EstimateView, req: WhatIfRequest, ruleId: RuleId): Promise<ChatReplyView> => {
  const fixed = (text: string) => reply(`What if ${req.label}: ${text}`, false, [], 'whatif');
  const plan = getPlan(view.claim.planId) ?? fail('PLAN_NOT_FOUND');
  const facts = toClaimFacts(await listFacts(user.id, claimId), view.claim.planId);
  // Never a ward room for an ICU stay (CLAUDE.md): the two are capped differently.
  if (req.patch.room && facts.room.category === 'icu' && req.patch.room.category !== 'icu') {
    // No amounts and no echo of the typed rent: there is nothing to compare.
    return reply('An ICU stay can’t be compared with a ward room; the policy caps them differently. Ask the hospital what an ICU day costs instead.', false, [], 'whatif');
  }
  let patch = req.patch;
  if (req.afterWait) {
    // A waiting period we cannot work out is not "no waiting period".
    const unknownWaits = view.estimate.results.filter((r) => WAITS.includes(r.ruleId) && r.outcome === 'unknown');
    if (unknownWaits.length > 0) {
      const needed = [...new Set(unknownWaits.flatMap((r) => r.missingFacts))].map((k) => FACT_LABELS[k]);
      return fixed(`we can’t work out the waiting period yet. Add: ${needed.join(', ')}.`);
    }
    // The latest date a failing waiting period ends, from the engine's own params.
    const ends = view.estimate.results
      .filter((r) => WAITS.includes(r.ruleId) && r.outcome === 'fail' && typeof r.params.waitEnds === 'string')
      .map((r) => r.params.waitEnds as string)
      .sort()
      .at(-1);
    if (!ends) return fixed('none of this claim’s waiting periods is still running, so there is no date to move to.');
    patch = { admissionDate: ends };
  }
  const after = simulateFacts(facts, plan, patch, view.estimate.factsVersion);
  console.info(`[chat] rule=${ruleId} whatif=true`);
  return reply(whatIfText(view.estimate, after, req, patch), false, [], 'whatif');
};

export const askAboutCheck = async (user: CurrentUserView, claimId: string, ruleId: RuleId, input: ChatAskInput): Promise<ChatReplyView> => {
  // Guests (samples) promise "no AI call" and are free to create, so the free AI quota is for accounts only.
  if (user.isGuest) return fail('AUTH_REQUIRED');
  const view = await estimateView(user.id, claimId); // owner-scoped: NOT_FOUND for anyone else's claim
  const result = view.estimate.results.find((r) => r.ruleId === ruleId);
  if (!result || result.outcome === 'pass') return fail('NOT_FOUND');

  if (refusesToHide(input)) {
    console.info(`[chat] rule=${ruleId} refused=true cited=0 guard=hide`);
    return reply(HIDE_REFUSAL, true);
  }
  const whatIf = parseWhatIf(input.question);
  if (whatIf) return answerWhatIf(user, claimId, view, whatIf, ruleId);
  return runGrounded(user, checkSources(view, result), input, `rule=${ruleId}`);
};

