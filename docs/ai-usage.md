# How AI was used to build ClaimSense

AI (Claude, and Claude Code in the repo) was used in every phase, not only for code.
Humans made the product decisions and checked every AI output that affects a verdict.

> The links below point to private Claude artifacts. Share them from each page's Share
> menu before submitting, or export them into `docs/` so judges can read them.

## By phase

| Phase | What AI did | What the human decided or checked | Evidence |
|---|---|---|---|
| Explore | Market research: existing apps (ClaimSetu, COVER AI, Insurance Samadhan, ICICI Lombard AI), rejection data, IRDAI rules, ombudsman and consumer-court rulings, insurer filings | Picked the gap: a pre-filing check for retail policyholders that reads the policy and the medical reports together | [Research PRD](https://claude.ai/code/artifact/94ecf63b-14bc-4184-81e9-d9608b70788b) |
| Define | Drafted and revised the PRD; debated features (AI argued against an open-ended chatbot, against fake-precise approval percentages, and for a fraud guardrail) | Users = anyone; personal policies only; web app; voice deferred; synthetic data only; 3-day scope | [MVP PRD](https://claude.ai/code/artifact/6e1ada70-044e-4f36-a590-d75f76c05167), `docs/prd.md` |
| Design | Use-case diagram, user journey, screen mockups, architecture, data model, API contracts, rules spec | Desktop-first 3-panel layout; rules engine separate from the LLM; MongoDB + private blob storage | [Screens](https://claude.ai/artifact/3pj6Ub9GQbaJaNFvytLntv), `docs/architecture.md` |
| Context | Wrote `CLAUDE.md`, skills, agents, hooks and workflows tailored to this project | Reviewed every rule in `CLAUDE.md` and every hook | `.claude/`, `.github/workflows/` |
| Build | Claude Code (Opus 5.5) ran `AUTOPILOT.md` end to end: shared schemas, Star FHO config, rules engine, backend, extraction, screens, e2e, CI | Human wrote the prompt, the rules spec, Case B and the first 13 rules test cases; merges each PR | branches [shared-schemas](https://github.com/theshiv12/ClaimSense/tree/feat/shared-schemas), [rules-engine](https://github.com/theshiv12/ClaimSense/tree/feat/rules-engine), [backend](https://github.com/theshiv12/ClaimSense/tree/feat/backend), [extraction](https://github.com/theshiv12/ClaimSense/tree/feat/extraction), [ui](https://github.com/theshiv12/ClaimSense/tree/feat/ui), [e2e](https://github.com/theshiv12/ClaimSense/tree/feat/e2e) |
| Test | Test cases in `docs/test-cases.md` before code, red commit, green commit (`docs/TDD.md`): about 260 tests across shared, rules, web and e2e | Rows marked *autopilot* are **not yet human-approved**; one AI arithmetic slip (TC-EXT-12) fixed and logged | `docs/TDD.md`, `AI_LOG.md` |
| Review | `code-reviewer` agent after every phase. It found 50+ issues, including a quote check that ignored the value, a login timing leak, a non-atomic rate limit, a bill line counted twice, and a GET route that logged users out. Each fix got its own red → green pair | Human reads every PR before merging | `AI_LOG.md` (Review rows), refactor commits |
| Document | README, TDD log (generated from git), ADR-007/008, architecture update, this file | Human edits before submitting | `README.md`, `docs/` |

## Context engineering

| Context | Where | Why it helps the AI |
|---|---|---|
| Requirements | `docs/prd.md` | Acceptance criteria and FR ids to build and test against |
| Architecture and contracts | `docs/architecture.md`, `docs/api.md`, `packages/shared` | One source of truth for shapes; fewer invented fields |
| Domain rules | `docs/rules-spec.md`, `config/plans/*.json` | Rule values never come from model memory |
| Standards and guardrails | `CLAUDE.md`, `.claude/hooks/` | Golden rules applied on every edit; secrets and health-data logging blocked automatically |
| Workflows | `.claude/skills/`, `.claude/agents/` | Repeatable test generation, plan extraction, evals and review |
| Learning | `AI_LOG.md` | Every AI mistake becomes a rule, a test or a skill change |

## Guardrails and the tests that prove them

| Guardrail | Enforced by | Test |
|---|---|---|
| Model never decides money | Engine is pure; Gemini output has no verdict field (strict schema) | TC-GEM-04, TC-INJ-01 |
| Unverified fact = unknown | `isUsable`, `verifyQuote` (stated page), `valueInQuote` | TC-TCF-01..09, TC-QV-01..09, TC-EXT-12 |
| Document text is data | Untrusted-content system instruction; AI-directed text flags every fact | TC-GEM-01, TC-INJ-01 (payload stored base64) |
| Only `gemini.ts` talks to Gemini | ESLint `no-restricted-imports` | lint in CI |
| Tests never call live Gemini | `getLlm` throws under Vitest without `FakeLlm`; fake key forced | TC-EXT-*, setup |
| Owner scoping, 404 not 403 | `scope.ts` finders | TC-OWN-01..04, TC-E2E-03 |
| Files never stored, no health data in logs | bytes discarded; ids-only logging | TC-EXT-09 |
| No dropping real data | `.claude/hooks/guard-bash.mjs` | blocked the AI once (AI_LOG) |
| Secrets | gitleaks + Semgrep `p/secrets` in CI | CI |

## Model per task

| Task | Model |
|---|---|
| Planning, review (`code-reviewer` agent), implementation in the autopilot run | Claude Opus 5.5 (Claude Code) |
| Runtime fact extraction | Gemini 3.8 Flash, fallback 3.5 Flash-Lite (free tier) |

## Human validation (status at the end of the autopilot run)

- **Done by a human before the run:** rules spec, Case B arithmetic, TC-R1..R8 / TC-ENG / TC-CASE test cases.
- **Pending:** every item in `pendingHumanReview` in `config/plans/star-fho.json` (ADR-007); approval of the
  test-case rows marked *autopilot*; the remedies written by the AI in `config/remedies.json`; the rounding
  change in `docs/rules-spec.md`; one live Gemini upload (ADR-008).

## Cost

Free tiers only (ADR-005): Gemini free tier (no live call was made during the build: fixtures only),
Vercel Hobby, Atlas M0, GitHub Actions. Claude Code ran on the developer's subscription.
