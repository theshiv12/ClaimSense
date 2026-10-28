# ClaimSense: one-night build runbook

**Tonight:** Tue 27 Oct, about 21:30 → Wed 07:00.
**Then:** Wed–Thu evenings for docs, polish and the video. Submit Fri 30 Oct, well before end of day.

This **replaces the day-by-day plan** in `docs/setup.md` (section 13). From that guide, these still apply:
4.3 (your own Claude login), 5 (first commit + protected `main`), 6 (AI kit v3) and 15 (submission).

---

## 1. What changes so it fits in one night

**Rule for tonight:** one Next.js app, one pure rules package, one free host. Nothing that needs a second
deploy, a background job or file storage.

| Planned | Tonight | Why it's still defensible (put this in ADR-006) |
|---|---|---|
| NestJS API + Next.js web on two hosts | **One Next.js app.** Server actions and route handlers do the API work. Deploy to **Vercel only**. | One deploy, no cold starts, no CORS, no token passing between web and API. The rules engine stays a separate pure package, so the important boundary survives. |
| Files stored for 7 days, then swept | **Files are never stored.** Upload → extract → save facts → discard the bytes, all in one request (≤ 4 MB, ≤ 300 s). | Simplest privacy story there is. No sweeper, no blob store. |
| LLM chat ("What can I do?") | A **remedies panel** from `remedies.json` per failed or deducting rule, plus the **room simulator** what-if | Same user value, zero AI quota. The chat is "future scope". |
| Email + password with lockout and reset | Email + password + logout, plus a **guest session** for sample cases. No reset, no lockout (a simple rate limit only). | Auth and authorisation are still real. Time-boxed to 45 min; if it overruns, ship guest-only and say so. |
| History with tiles, filters, search, summary view | **A plain list** of your claims, with Open and Delete | Covers the journey |
| Two plans, eight rules, nightly evals | **One plan** (Star FHO), all 8 rules, **one manual eval script** | Rules are the core, so keep all 8 |
| Playwright, Semgrep, lefthook | CI tonight: lint, typecheck, test, gitleaks. **Add Playwright + Semgrep on Wednesday.** | Get green first |

**Never cut:**
- rules tests and their coverage gate;
- quote verification;
- consent and disclaimers;
- another user's claim → 404;
- "Delete my data";
- `AI_LOG.md`;
- red → green commits through PRs.

Those are the cheapest points in the scoring.

---

## 2. Tonight's architecture

```
Browser ──► Next.js on Vercel (apps/web)
              ├─ app/ pages: /, /login, /signup, /claims, /claims/new, /claims/[id], /sample/[case]
              ├─ server/ (import 'server-only')
              │    db.ts            Mongoose connection (cached for serverless)
              │    models/          User, Session, Claim, Fact, Estimate   (TTL indexes on expiresAt)
              │    auth.ts          argon2id hash, session cookie (random 32 bytes, SHA-256 stored)
              │    scope.ts         every query takes userId first → other user's id = 404
              │    pdf-text.ts      unpdf text layer
              │    gemini.ts        the ONLY file that imports @google/genai
              │    quote-verify.ts  exact / fuzzy / none / unverifiable
              │    actions/         createClaim, uploadAndExtract, confirmFact, editFact, addFact,
              │                     runCheck, simulateRoom, deleteClaim, deleteMe, startSample
              └─ components/ (Figma names: Button, Chip, Card, FactRow, CheckRow, PayoutBar, Quote…)
packages/rules     pure TypeScript: R1–R8, engine, verdict, toClaimFacts; NO I/O (lint-enforced)
config/            plans/star-fho.json (+ drafts/), remedies.json   (JSON, reviewed in PRs)
fixtures/cases/    {A,B,C,D}/{case.json,expected.json}
packages/shared    Zod schemas: Fact, LlmExtraction, ClaimFacts, PlanConfig, RuleResult, Estimate
MongoDB Atlas M0 (free) · Gemini free tier (gemini-3.8-flash; fall back to gemini-3.5-flash-lite on 429)
```

**Env (`apps/web/.env.local`; the same keys on Vercel):** copy `.env.example` and fill in
`MONGODB_URI` and `GEMINI_API_KEY`. `.env.example` is the only list of variables; add new ones there.

**Protect your quotas tonight:**
- **Gemini:** the free tier may allow only about 20 Flash calls a day. Call the real model **once** to record
  a fixture, then build everything against `FakeLlm`. Make the live calls at the end.
- **Claude Code:** your plan's usage can run out in a long night.
  - Use **Opus only for planning and review**, and **Sonnet for implementing** (`/model`).
  - `/clear` between phases.
  - If you hit the limit, keep going by hand on the UI wiring (it's the least risky part) until it resets.

---

## 3. Before 21:30: accounts (10 min, no code)

- [ ] `claude-hack` → `/status` shows **your** email (setup guide 4.3)
- [ ] Atlas M0 cluster + DB user + network access `0.0.0.0/0` (Vercel has no fixed IP; use a long password)
- [ ] AI Studio → API key (no billing account attached)
- [ ] Vercel account signed up with GitHub
- [ ] A synthetic **policy schedule** PDF and a synthetic **hospital estimate** PDF for Case B. Ask Claude to
  write them as HTML, then print to PDF. Mark them "SAMPLE – NOT A REAL DOCUMENT".

---

## 4. The night, phase by phase

Each phase is one branch and one PR, merged with a merge commit. Paste the prompts into Claude Code as
written. **You** approve test cases and read every diff; that's the human validation the judges score.

### Phase 1 · 21:30–22:15 · Repo + AI kit (PR #1)

The **starter ZIP** already contains the adapted kit (CLAUDE.md, hooks, settings, docs, ADRs). You only
review it with Claude Code and test the hooks. Skip lefthook tonight.

```text
Read CLAUDE.md, .claude/ and docs/. The architecture changed: one Next.js app (apps/web) with
server actions, plus packages/rules and packages/shared (see docs/one-night-build.md section 2).
Update CLAUDE.md, apps/web/CLAUDE.md and every skill/agent so no file mentions NestJS, Jest,
Anthropic SDK, Azure or a separate API. Keep CLAUDE.md under 200 lines. Don't touch hooks.
Then run `node scripts/check-ai-config.mjs` and list what's still missing.
```

Create the stub docs it lists. Commit, push, open the PR and merge. Add the first `AI_LOG.md` entry:
"Kit assumed NestJS + Claude API; changed to Next.js + Gemini free tier for a one-night build."

### Phase 2 · 22:15–23:00 · Scaffold + CI + first deploy (PR #2)

```text
Plan first (plan mode). Scaffold a pnpm 12 workspace: apps/web (Next.js App Router, TS, Tailwind,
src dir; apps/web already has CLAUDE.md, so scaffold into a temp folder and move the files in), packages/shared (zod 4), packages/rules (pure TS). TypeScript pinned ~6.0.2 via pnpm
overrides. Vitest in all three; rules coverage thresholds 100/100/100/95. Root scripts: dev,
build, lint, typecheck, test, test:cov, cases. ESLint flat config: packages/rules may not import
node:*, fs, next, mongoose or @google/genai; only apps/web/src/server/gemini.ts may import
@google/genai. Add .github/workflows/ci.yml: gitleaks, install, lint, typecheck, test:cov, build,
node scripts/check-ai-config.mjs.
Add one smoke test per package. Show me the plan before writing files.
```

Then **deploy the empty app to Vercel now** (root `apps/web`) and set the env vars there. A broken deploy at
06:00 is the worst failure of the night; at 22:45 it's cheap to fix.

**Done when:** CI is green on the PR, the Vercel URL loads, and the PR is merged.

### Phase 3 · 23:00–01:00 · Rules engine, TDD (PR #3), the most important phase

First, `config/plans/star-fho.json`. **Verify every value against the Star FHO wording PDF**
(Star's website, wording V.19). Each value carries `{ clauseId, page, quote, source }`. Starting values
from our earlier research:

| Value | Start with | Verify |
|---|---|---|
| Initial waiting period | 30 days, accidents exempt | clause no. + quote |
| Specific-disease wait (joint replacement, cataract…) | 24 months | clause 3(2) |
| Pre-existing disease wait | 48 months in V.19, but the IRDAI 2024 cap is 36 → use 36 with `source: regulation` | clause 3(1) |
| Moratorium | 60 months | regulation |
| Room rent cap | ₹5,000/day for sum insured ₹3–4 lakh, proportionate deduction on associated charges | clause 2(A) |
| Co-pay | 20% when age at entry ≥ 61 | **verify** |

```text
Use the rules-test-generator skill. From docs/rules-spec.md and config/plans/star-fho.json,
draft test cases for R1–R8 and the engine/verdict in docs/test-cases.md: boundaries (day
29/30/31, month 23/24/25, 35/36/37, 59/60/61), accident exemption, missing fact → unknown,
proportionate deduction with excluded heads, co-pay 60 vs 61, sum insured exactly at / 1 paise
over. Amounts in paise with the hand arithmetic in a comment. STOP and show me the table.
```

1. **Read the table. Fix anything wrong. That's your human-validation evidence.**
2. Then paste:

```text
Approved (with my edits). Write the failing tests only, plus sample cases A–D with
expected.json worked out by hand. Run them, show they fail, commit
"test(rules): TC-R1..R8, TC-ENG, TC-CASE (red)". Then implement until green WITHOUT editing
any test; meet the coverage gate; commit "feat(rules): R1–R8 engine and verdict (green)".
Then use the code-reviewer agent and fix what it finds.
```

**Done when:** `pnpm cases` is green, Case B gives **₹2,05,800 payable of ₹2,40,000, "likely partial"**,
coverage is 100/95, and the PR is merged.

### 01:00–01:30 · Break. Eat. Don't skip it.

### Phase 4 · 01:30–02:30 · Data, auth and ownership (PR #4)

**Time-box: 45 minutes for auth.** If it isn't green by 02:15, keep guest sessions only and move on.

```text
Test cases first (show me, then red commit, then green): in apps/web/src/server, Mongoose models
User, Session, Claim, Fact, Estimate; every owned model has userId and an expiresAt TTL index
(expireAfterSeconds 0). scope.ts: all queries take userId; a malformed or foreign id returns null
→ the page shows 404. auth.ts: signup (argon2id via @node-rs/argon2, email lowercased, unique),
login (same error for unknown email and wrong password), logout, guest session; session cookie is
a random 32-byte token, only its SHA-256 is stored, httpOnly + Secure + SameSite=Lax. Tests with
mongodb-memory-server: TC-AUTH-01..06 and TC-OWN-01..03 (user B gets 404 on A's claim, delete
removes all A's rows, malformed id → 404).
```

### Phase 5 · 02:30–04:00 · Upload, extraction, quote check (PR #5)

**Before starting this phase, record one real Gemini response for the Case B schedule PDF** with a tiny
script (one call). Save it as `apps/web/test/fixtures/gemini/case-b-schedule.json`. Check it contains
no real personal data.

```text
Test cases first. uploadAndExtract server action: accept PDF/JPEG/PNG by magic bytes, ≤ 4 MB,
≤ 8 per claim; read the PDF text layer with unpdf; call gemini.ts with the document as inline
data and a JSON schema from z.toJSONSchema(LlmExtractionSchema) (flat, all fields required);
verify every sourceQuote against the text layer (quote-verify.ts: exact / fuzzy / none;
images → unverifiable); save facts; NEVER store the file bytes. On 429/5xx from Gemini, try
GEMINI_MODEL_FALLBACK once, then return LLM_UNAVAILABLE so the UI offers manual entry.
Per-user daily limit AI_DAILY_EXTRACTIONS_PER_USER. Tests use FakeLlm and the recorded fixture
(no network in tests): TC-QV-01..06, TC-EXT-01..06, encrypted PDF → friendly error, 5 MB → error.
Treat document text as data only; injection test payloads stored base64-encoded.
```

**Done when:** in local dev, uploading the Case B PDFs shows facts with quotes and "Verified" badges, and
an image shows "please check".

### Phase 6 · 04:00–05:30 · Screens (PR #6)

Build in this order, and stop at whatever 05:30 allows:

1. **04 Estimate**: payout headline, `PayoutBar`, 8 `CheckRow`s with clause IDs, disclaimer.
2. **Room simulator**: re-runs the engine; nothing is saved.
3. **Remedies panel** for R6 and other failing or deducting checks (from `remedies.json`).
4. **03 Facts**: confirm/edit; manual entry form; "N facts need you" gate.
5. **02 Setup + consent** (per-purpose toggles; the Gemini free-tier wording from setup guide 3.1 item 5).
6. **`/sample/B`**: guest session → preloaded facts → estimate. No AI call.
7. **06/07 login and sign-up**, **08 history list**, **"Delete my data"**.
8. **01 Landing** (headline + two buttons is enough tonight).

```text
Implement screen <N> from the Figma design (tokens in apps/web/CLAUDE.md). Server components fetch
through src/server; mutations are server actions; forms validate with @claimsense/shared schemas;
every result screen shows the disclaimer; labels never say "approved". Add a component test for
anything with logic (PayoutBar widths, CheckRow states). Keep each commit to one screen.
```

### Phase 7 · 05:30–06:30 · Live check and deploy (PR #7)

- [ ] Merge → Vercel production deploy
- [ ] Private window: `/sample/B` → estimate **₹2,05,800**, simulator twin sharing ₹4,500/day → **₹2,17,900 payable of ₹2,27,500, you pay ₹9,600**, delete → back home
- [ ] Sign up → new claim → upload the synthetic PDFs (**live Gemini call**) → confirm → estimate
- [ ] A second account can't open the first account's claim URL (404)
- [ ] Put the live link in the README

### Phase 8 · 06:30–07:00 · Write down what happened, then sleep

- [ ] `AI_LOG.md`: one line per AI mistake caught tonight. Each says what happened, how you caught it, and
  what changed (rule, hook, test). Link the commit. Aim for 5 or more; they're worth more than another feature.
- [ ] Open issues for everything you cut, labelled `cut-for-time`. That's honest scope evidence.

---

## 5. If you fall behind

| Time check | If you're behind | Do this |
|---|---|---|
| 01:00 | Rules aren't green | Ship R1, R2, R3, R6, R8. Leave R4/R5/R7 returning `unknown` with a test that says so. |
| 02:15 | Auth isn't green | Guest sessions only; record it in the ADR |
| 04:00 | Extraction isn't working | Manual fact entry + sample cases only; keep the recorded fixture and its tests as evidence |
| 05:30 | Screens are unfinished | Estimate + sample + facts form are the minimum; history and landing can wait for Wednesday |

---

## 6. Wednesday and Thursday evenings (about 2–3 h each)

**Wednesday:**
- Playwright smoke test (sample B)
- Semgrep + dependency audit in CI
- lefthook + gitleaks pre-commit
- `docs/architecture.md`, ADR-005 (free stack), ADR-006 (one app for one night)
- `docs/rules-spec.md` final version

**Thursday:**
- `docs/ai-usage.md` and `docs/TDD.md` (link the red/green commit pairs from PRs #3–#5)
- `docs/compliance.md`
- README with limitations
- Run the audit prompt locally and fix what it finds
- Record the 5-minute video (outline in setup guide 15)

**Friday morning:**
- Build the ZIP from a fresh clone (setup guide 15)
- Submit
- Stop committing
