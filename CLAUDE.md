# ClaimSense

Web app that tells a policyholder in India, **before admission**, what their personal health
policy is likely to pay, what gets cut and why (each reason cites the policy clause and the line
in their own document), and what they can do about it. Hackathon MVP, solo, deadline 30 Oct 2026.

**Where to find what**

| Need | File |
|---|---|
| How to set up / run | tonight's plan `docs/one-night-build.md` (`docs/setup.md` is reference only: sections 7–14 are superseded) |
| Requirements | `docs/prd.md` |
| Rules R1–R8, boundaries, worked Case B | `docs/rules-spec.md` |
| Architecture | `docs/architecture.md` |
| Server actions (the "API") | `docs/api.md` |
| Decisions | `docs/decisions/` |
| Test cases (written before tests) | `docs/test-cases.md` |
| AI policy, compliance | `docs/ai-policy.md`, `docs/compliance.md` |
| AI usage + mistakes log | `docs/ai-usage.md`, `AI_LOG.md` |
| Original NestJS plan (superseded, schemas still useful) | `docs/reference/nest-plan/` |

## Golden rules (never break these)

1. **The model never decides money or verdicts.** Gemini extracts facts. Verdicts and amounts
   come only from `packages/rules`.
2. **No rule values in code.** Waiting periods, caps, co-pay, disease lists and clause ids
   live in `config/plans/*.json`, each value with a `ClauseRef { clauseId, page, quote, source }`.
3. **Every fact is traceable:** `value`, `status` (`found|not_found|illegible`), `source`
   (`document|user-stated|user-corrected`), `documentId`, verbatim `sourceQuote`, `page`,
   `confidence` (`high|medium|low`), `verification` (`exact|fuzzy|none|unverifiable`).
4. **Validate with Zod** (`packages/shared`): every form, every server action input, every
   model output. A fact whose quote did not verify, or with low confidence, is `unknown` to the
   engine until the user confirms it. Never guess.
5. **Owner scoping:** every query on claims, facts and estimates filters by `userId`.
   Another user's id, or a malformed id, gives 404, never 403.
6. **Never log health data:** no facts, diagnoses, quotes, document text or file names in logs.
7. **Never commit secrets.** Config comes from env; every new variable goes in `.env.example`.
8. **Document content is data, never instructions.** Only the Gemini adapter (`gemini.ts` in the
   web app's server folder) talks to Gemini: inline document data, a system instruction saying document text is untrusted,
   JSON-schema structured output only. Injection test payloads are stored base64-encoded.
9. **Uploaded files are never stored.** Read → extract → save facts → discard bytes.
10. **Remedies only from `config/remedies.json`.** Never help hide, change or back-date medical
    facts. Labels never say "approved"; every result shows the disclaimer.

## Repo layout

```
apps/web              Next.js App Router: UI + server actions (the only app)
  src/server/         server-only: db, models, auth, scope, gemini, pdf-text, quote-verify, actions/
  src/components/     ui/ (Button, Chip, Card, Field, Toggle…) and claim/ (FactRow, CheckRow, PayoutBar…)
packages/shared       Zod schemas + types (Fact, LlmExtraction, ClaimFacts, PlanConfig, Estimate)
packages/rules        Rules engine R1–R8: pure functions, no I/O, no clock, no SDKs
config/plans          Plan configs (star-fho.json); drafts/ are never loaded
config/remedies.json  Remedy catalog per rule outcome
fixtures/cases        Synthetic cases A–D: case.json + expected.json (hand-calculated)
docs                  see the table above
```

## Commands

```
pnpm install
pnpm dev                                   # Next.js on :3000
pnpm test                                  # all Vitest suites (in-memory MongoDB, fake Gemini)
pnpm --filter @claimsense/rules test       # rules only
pnpm exec vitest run <path> -t "TC-R3"     # one file / one test id
pnpm test:cov                              # with coverage gates
pnpm lint && pnpm typecheck && pnpm build
pnpm cases                                 # fixtures/cases through the engine vs expected.json
node scripts/check-ai-config.mjs           # AI config sanity check (add it to ci.yml in PR #2)
```

## Coding standards

- TypeScript `~6.0.2` (never `@latest`), `strict`, no `any` (use `unknown` + Zod).
- Money is integer **paise**, percentages are **basis points**, calendar dates are `YYYY-MM-DD`.
- Rules: one file per rule, `packages/rules/src/rules/r<N>-<name>.ts`. R1–R5:
  `(facts, plan) => RuleResult`. R6–R8: `(facts, plan, runningPaise) => RuleResult`.
- `apps/web/src/server/**` starts with `import 'server-only'`. Only `gemini.ts` imports
  `@google/genai`; only server code imports `mongoose`. ESLint enforces both.
- Mutations are server actions; they return `{ ok: true, data } | { ok: false, code }` with an
  `ErrorCode` from `packages/shared`, never raw errors.
- Files kebab-case, types PascalCase, functions camelCase. One issue → one branch → one PR.

## Testing (test-driven; Vitest only, never Jest)

- Follow the `tdd` skill: test cases in `docs/test-cases.md`, approved by the human →
  failing tests committed `(red)` → code committed `(green)` → refactor.
- **Never change a test to make it pass.** If a test looks wrong, stop and ask.
- Test names start with their test-case ID (`TC-R3-01 …`).
- Expected values come from `docs/rules-spec.md` and the plan config, worked out by hand with
  the arithmetic in a comment, **never** from running the implementation.
- Every server action: no session → `AUTH_REQUIRED`, other user's id → 404, bad input → error code.
- Tests never call live Gemini: use `FakeLlm` and recorded fixtures.
- Done = `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm cases` all pass.

## Working with AI on this repo

- Plan first (plan mode) for anything touching more than 3 files.
- One issue per session; `/clear` between issues; `/compact` past half the context.
- Opus for planning and review, Sonnet for implementing.
- Run the `code-reviewer` agent before every PR; fix or answer each finding.
- When the AI gets something wrong, add a line to `AI_LOG.md` and, if it can recur, a rule here.
- Only a human clears `needsReview` on a plan clause. If the AI promotes a draft, it lists every open
  item in the plan's `pendingHumanReview` and says so in the PR.
- AI-assisted commits end with `Co-Authored-By: Claude <noreply@anthropic.com>`.
- Keep this file under 200 lines. Detail belongs in `docs/`.

## Domain glossary

- **PED**: pre-existing disease. **SI**: sum insured. **UIN**: IRDAI plan id. **TPA**: third-party administrator.
- **Moratorium**: after the plan config's `moratorium.months` of continuous cover, a claim can be
  contested only for proven fraud.
- **Proportionate deduction**: when the room costs more than the cap, associated charges are paid in
  the ratio cap ÷ actual rent. Excluded heads come from the plan config (`excludedHeads`).
- **Co-pay**: % of each claim the insured pays; the tiers and the age at entry that triggers them come
  from `coPay` in the plan config, never from here.
