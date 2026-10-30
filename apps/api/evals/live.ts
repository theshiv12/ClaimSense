// FR-18 live run (manual; needs GEMINI_API_KEY in apps/api/.env.local, plus MONGODB_URI set to any value because
// the env schema requires it, though no database is used; an approval point, it calls Gemini):
//   pnpm --filter @claimsense/api eval:live
// Sample B through the engine (no database), each CE scenario through the same routing and checks as the API,
// and a report in evals/reports/. Never run in CI: tests use FakeLlm (evals.test.ts).
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { estimate } from '@claimsense/rules';
import { LlmChatAnswerSchema, type ChatReplyView, type EstimateView } from '@claimsense/shared';
import { geminiFromEnv } from '../src/integrations/gemini';
import { getPlan, remedies } from '../src/lib/plans';
import { SAMPLES } from '../src/lib/samples';
import { checkSources, finalize, HIDE_REFUSAL, refusesToHide, reply } from '../src/modules/chat/chat.service';
import { checkExpectations, type EvalScenario } from './expect';

const dir = new URL('./conversations/', import.meta.url);
const scenarios = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')) as EvalScenario);

const plan = getPlan(SAMPLES.B.facts.planId);
if (!plan) throw new Error('sample B plan not loaded');
const before = estimate(SAMPLES.B.facts, plan, 0);
const llm = geminiFromEnv();

const results: { id: string; ok: boolean; problems: string[]; refused: boolean }[] = [];
for (const s of scenarios) {
  const result = before.results.find((r) => r.ruleId === s.ruleId);
  if (!result) throw new Error(`${s.id}: no ${s.ruleId} result`);
  const view: Pick<EstimateView, 'evidence' | 'remedies' | 'precedents'> = {
    evidence: s.injectedDocLineB64
      ? { [s.ruleId]: [{ key: 'room_rent_per_day', quote: Buffer.from(s.injectedDocLineB64, 'base64').toString('utf8'), page: 1 }] }
      : {},
    remedies: remedies.remedies.filter((m) => m.ruleId === result.ruleId && m.outcome === result.outcome),
    precedents: {},
  };
  const input = { question: s.question, history: [] };
  let out: ChatReplyView;
  let modelCalled = false;
  if (refusesToHide(input)) out = reply(HIDE_REFUSAL, true);
  else {
    modelCalled = true;
    const sources = checkSources(view, result);
    out = finalize(LlmChatAnswerSchema.parse(await llm.answer({ sources, ...input })), sources, input.question);
  }
  const problems = checkExpectations(s, out, modelCalled);
  results.push({ id: s.id, ok: problems.length === 0, problems, refused: out.refused });
  console.info(`${problems.length === 0 ? 'PASS' : 'FAIL'} ${s.id} ${s.title}${problems.length ? ` — ${problems.join('; ')}` : ''}`);
}

mkdirSync(new URL('./reports/', import.meta.url), { recursive: true });
const file = new URL(`./reports/${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`, import.meta.url);
writeFileSync(file, JSON.stringify({ model: 'live', results }, null, 2));
console.info(`${results.filter((r) => r.ok).length}/${results.length} passed; report: ${file.pathname}`);
process.exitCode = results.every((r) => r.ok) ? 0 : 1;
