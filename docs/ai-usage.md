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
| Build | _fill in: which features were built by Claude Code, from which issues/plans_ | _fill in_ | git history, PRs |
| Test | _fill in: rules-test-generator output, qa-agent runs_ | _fill in: which AI tests were rejected or corrected, and why_ | `packages/rules/**/__tests__` |
| Review | _fill in: code-reviewer findings and what was fixed_ | _fill in_ | PR comments |
| Document | _fill in_ | _fill in_ | `README.md`, `docs/` |

## Context engineering

| Context | Where | Why it helps the AI |
|---|---|---|
| Requirements | `docs/prd.md` | Acceptance criteria and FR ids to build and test against |
| Architecture and contracts | `docs/architecture.md`, `docs/api.md`, `packages/shared` | One source of truth for shapes; fewer invented fields |
| Domain rules | `docs/rules-spec.md`, `config/plans/*.json` | Rule values never come from model memory |
| Standards and guardrails | `CLAUDE.md`, `.claude/hooks/` | Golden rules applied on every edit; secrets and health-data logging blocked automatically |
| Workflows | `.claude/skills/`, `.claude/agents/` | Repeatable test generation, plan extraction, evals and review |
| Learning | `AI_LOG.md` | Every AI mistake becomes a rule, a test or a skill change |

## Human validation

- Every plan config value checked against the policy wording, with clause numbers.
- Every AI-generated test reviewed before commit; expected values taken from the spec.
- Every remedy in `config/remedies.json` written or approved by a human.
- Code-reviewer findings fixed or explicitly justified in the PR.
