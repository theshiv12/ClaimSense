# AI kit changes

## Twenty-one surgical edits align the AI kit with this blueprint

The kit is sound. Its golden rules, hooks and skills fit this design. Its mismatches all come from assumptions that changed in the last eight weeks: Jest, Node 22, a generic `LlmService.extract`, and a fact with only a `quote`. These are the exact edits.

| File | Current text | Change to | Why |
|---|---|---|---|
| `CLAUDE.md`, golden rule 3 | "value + `source` (…) + `documentId` + verbatim `quote`" | "value + `status` (`found\|not_found\|illegible`) + `source` (`document\|user-stated\|user-corrected`) + `documentId` + verbatim `sourceQuote` + `page` (1-based physical) + `confidence` (`high\|medium\|low`) + `verification` (`exact\|fuzzy\|none\|unverifiable`)" | Matches `FactSchema` |
| `CLAUDE.md`, golden rule 4 | "Invalid or low-confidence LLM output → field marked missing" | Append: "A fact whose quote did not verify, or with low confidence, is `unknown` to the engine until the user confirms it." | Makes the usability rule explicit |
| `CLAUDE.md`, golden rule 8 | "Wrap it in delimiters in prompts" | "Documents go in as `document`/`image` blocks with `title` and an untrusted `context`; the system prompt states the untrusted-content policy; extraction uses structured outputs only, with no tools, no citations and never `temperature`." | API 2026-10-21; citations and structured outputs can't be combined |
| `CLAUDE.md`, repo layout | `config/plans`, `fixtures/cases` as folders | Note that `config/` and `fixtures/` are workspace packages `@claimsense/config` and `@claimsense/fixtures`; add `evals/extraction`; mark `apps/web` "placeholder until the backend ships" | `pnpm deploy` ships them |
| `CLAUDE.md`, commands | `pnpm dev # web + api`; `pnpm test # all unit tests` | `pnpm dev # api + package watchers`; `pnpm test # unit + API integration (in-memory MongoDB)`; add `pnpm build`, `pnpm test:cov`, `pnpm format:check`, `pnpm eval:extraction` | Matches the root scripts |
| `CLAUDE.md`, coding standards | "throw `HttpException`s with an error code"; rules signature `(facts: ClaimFacts, plan: PlanConfig) => RuleResult`; module list `claims, documents, extraction, checks, chat` | "throw `AppException(ErrorCode.X)`"; R1–R5 keep that signature, **R6–R8 take `(facts, plan, runningPaise)`**; add modules `users, plans, sample, health`; add "ESM: relative imports end in `.js`, use `import.meta.dirname`"; "TypeScript stays `~6.0.2` (never `@latest`; 7.x breaks typescript-eslint and the Nest CLI)"; "validation through our own `ZodValidationPipe` (not nestjs-zod, which doesn't support Nest 12)"; "no clock in `packages/rules`; dates are `YYYY-MM-DD`; percentages are basis points" | Amount rules need the running total; ESM and TS pin |
| `CLAUDE.md`, testing | Silent on the runner; "no session → 401, other user's claim → 404, bad body → 400" | Add "Vitest (`import { describe, it, expect, vi } from 'vitest'`), never Jest"; add "malformed id → 404"; add "route tests mint real tokens with `signTestToken()`" | One runner |
| `CLAUDE.md`, glossary | "Proportionate deduction … not to pharmacy, consumables, implants, diagnostics or ICU" | "… excluded heads come from `proportionateDeduction.excludedHeads` in the plan config; the list is unverified against the circular (`headsVerified: false`)" | Golden rule 2: no rule values in code or prose |
| `apps/api/CLAUDE.md`, module pattern | `__tests__/ <name>.controller.spec.ts (API), <name>.service.spec.ts (unit)` | `__tests__/<name>.e2e-spec.ts` (supertest via `createTestApp()`, also repository tests) and `<name>.service.spec.ts` (unit, no MongoDB); add one line each on `src/common/` and `src/infra/` | Matches the Vitest include globs |
| `apps/api/CLAUDE.md`, building blocks | `@UseGuards(AuthGuard)`; `LlmService.extract(schema, instructions, documents)`; `StorageService` | "`AuthGuard` is global; only `/health` is `@Public()`"; "inject `LlmService` (abstract) and call `extractFacts` / `screenForInjection` / `classifyMessage` / `composeReply`; only `src/infra/llm/` imports `@anthropic-ai/sdk` (ESLint enforces it)"; same for `StorageService` and `@azure/storage-blob`; new rows: "current time → `Clock`", "verify a quote → `verifyQuote()`", "plans, remedies, samples → `PlanRegistry`, `RemedyCatalog`, `SampleCases`" | Domain-level port; lint-enforced boundaries |
| `apps/api/CLAUDE.md`, tests | "`FakeLlmService` (returns recorded fixtures, can time out or return invalid JSON)" | "`FakeLlmService` returns canned domain results and can throw `LLM_UNAVAILABLE`/`LLM_REFUSED`. Recorded API responses in `test/fixtures/llm/` are replayed through the **real** `AnthropicLlmService` via an injected `fetch` (contract tests). Add `FixedClock`. Use `import request from 'supertest'`." | Separates fakes from contract fixtures |
| `.github/workflows/ci.yml` | `pnpm/action-setup@v4`; `node-version: 22`; `pnpm test -- --coverage` | `@v6`; `node-version-file: .nvmrc`; `pnpm test:cov`; add MongoDB binary cache, `format:check`, `build`, coverage artifact, Docker smoke, `concurrency` (full file above) | Node 24, pnpm 12, an explicit script |
| `.github/workflows/nightly-evals.yml` | Same `v4` and Node 22 | Same two fixes; add `pnpm eval:extraction` and upload its report | Consistency |
| `.claude/settings.json` | Allows `pnpm test/lint/typecheck/cases/--filter`, plus git read commands | Add `Bash(pnpm build:*)`, `Bash(pnpm format:*)`, `Bash(pnpm exec vitest:*)`, `Bash(pnpm exec eslint:*)`, `Bash(pnpm exec tsc:*)`. Leave `pnpm eval:*` needing approval (it spends API credit). | The new scripts |
| `.claude/hooks/check-after-edit.mjs` | Triggers on `packages/rules/`, `config/plans/`, `config/remedies.json`; runs `pnpm --filter @claimsense/rules test -- --silent` | Add `packages/shared/` to the trigger regex; run `pnpm --filter @claimsense/rules exec vitest run --silent` | Plan-schema edits break rules too; avoids `--` pass-through ambiguity |
| `.claude/hooks/guard-writes.mjs` | Health-data words: `facts?, diagnosis, …, documentText` | Add `sourceQuote` and `rawValue` | Both carry document text |
| `.claude/skills/rules-test-generator/SKILL.md` | "Writes Jest tests" | "Writes Vitest tests"; use `it.each` rows whose names start with the ID; load plans through `readPlanFiles()` + `PlanConfigSchema`; amounts in paise, with the hand arithmetic in a comment | One runner; Beck's anti-pattern |
| `.claude/skills/tdd/SKILL.md` | Green step runs `lint, typecheck, test, cases` | Add "for API issues the first red test is the route's `.e2e-spec.ts`"; "push red and green together; merge commit, not squash" | Preserves red/green history while CI stays green |
| `.claude/skills/new-rule` and `plan-config-extractor` | Each value carries `clauseId` and `quote` | Each value carries a `ClauseRef`: `{ clauseId, page, quote, source: 'wording' \| 'regulation' }`; new-rule step 4 notes the R6–R8 signature | Matches `PlanConfigSchema` |
| `.env.example` | `ANTHROPIC_MODEL`, no API secret | Split into `ANTHROPIC_MODEL_EXTRACT=claude-sonnet-5-5` and `ANTHROPIC_MODEL_CHAT=claude-haiku-5-5`; add `API_JWT_SECRET`, `MONGODB_DB`, `PORT=4000`, `LLM_TIMEOUT_MS=120000`, `FILE_TTL_HOURS=24`, `CLAIM_TTL_DAYS=30`, `GUEST_TTL_HOURS=24` | New env schema |
| `apps/web/CLAUDE.md` and `.claude/agents/code-reviewer.md` | "Jest + Testing Library"; "served only via short-lived signed URLs" | "Vitest + Testing Library"; "stored privately; no download route in the MVP (if one is added, proxy it through the API after an ownership check)" | One runner; no route serves blobs |

Two cheap additions turn this research into scoring evidence.

**`AI_LOG.md` entries**, dated 22 Oct:

- the kit assumed Jest and Node 22, but NestJS 12 defaults to ESM + Vitest; the kit was changed;
- `typescript@latest` is now 7.0 and would have broken linting; TS was pinned to `~6.0.2` with a pnpm override;
- SDK 1.0 rejects `temperature`, so tutorial code was not copied;
- citations can't be combined with structured outputs, so quote verification was built in code.

**ADRs in `docs/decisions/`**:

- ADR-001: ESM + Vitest;
- ADR-002: no Turborepo;
- ADR-003: structured outputs plus code-side quote verification;
- ADR-004: the Next-signed HS256 API token with guest users.

Each ADR is a paragraph, and each shows a decision made against evidence rather than defaults.
