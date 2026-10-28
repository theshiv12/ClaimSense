# ClaimSense: project setup guide

> **One-night build (27 Oct):** sections 7–14 are superseded by [one-night-build.md](one-night-build.md)
> (one Next.js app, files never stored). The NestJS plan now lives in `docs/reference/nest-plan/`.

How to set up the ClaimSense codebase from an empty folder to a green CI, in a way that matches the
product requirements, the **Build With AI Hackathon 2026** rules and the AI-workflow audit the
judges may run.

- **Put this file in the repo as** `docs/setup.md` and link it from `README.md` and `CLAUDE.md`.
- **Written:** 25 Oct 2026. **Deadline:** 30 Oct 2026, end of day. No changes after that. Judging: 2–5 Nov.
- **Supersedes:** the dates in `docs/reference/nest-plan/07-tdd-build-order.md` (planned for 22–25 Oct) and the
  Google sign-in / JWT parts of `docs/reference/nest-plan/01`, `03`, `04` and `08`. Section 3 says exactly what changed.

---

## 1. What we're building (one screen)

**ClaimSense** helps a patient or family member in India see, **before admission**, what their
personal health policy is likely to pay. It also shows what gets cut and why, with the exact clause,
and what they can do about it.

| In the MVP | Not in the MVP |
|---|---|
| Email + password sign-up, log in, log out; guest "Try a sample case" | Google sign-in, voice, mobile app |
| Consent per purpose; 18+ attestation; disclaimers on every result | Group/corporate policies |
| Upload PDF/JPG/PNG (≤ 4 MB) → Gemini (free tier) extracts facts with quote + page | Filing claims, talking to insurers |
| Enter facts by hand when the free AI limit is used up | Paid AI or paid hosting of any kind |
| Quote check in code; user confirms or corrects facts | Real patient data (synthetic only) |
| Rules engine R1–R8 → payout, out-of-pocket, label, clause per check | Court-case and rejection-rate data |
| Room simulator; "What can I do?" chat with what-if re-runs | Password reset by email (only if time allows) |
| History of past checks; open full or summary view | |
| Delete a claim; delete all my data; automatic expiry | |

**Principle:** the model reads documents and talks; **code decides the money**. Rule values come from
human-verified plan config, never from the model at runtime.

**Design:** Figma, file `9Dsx9Tsg5l8pq9cbEbdCMd`, screens 01–08:
- 01 Landing
- 02 Consent + setup
- 03 Upload + facts
- 04 Estimate
- 05 Chat
- 06 Log in
- 07 Sign up
- 08 My claims (history)

---

## 2. What the repo has to prove

The guide scores AI practice 35%, engineering 30%, product quality 25% and idea 10%. It also says
"show how AI contributed to the way you developed the product". Each row below is something a judge or
the audit prompt looks for, and where it lives.

| Judged on | Evidence in the repo | Section |
|---|---|---|
| Context engineering | `CLAUDE.md` (≤ 200 lines) + scoped `apps/*/CLAUDE.md`, `packages/rules/CLAUDE.md`; docs linked from it | 6 |
| Skills, agents, instructions | `.claude/skills/*` (with `allowed-tools` + a verify step), `.claude/agents/*` with `model:` | 6 |
| Guardrails | Hooks that block (exit 2), tested; deny/ask rules; lefthook + gitleaks | 6 |
| AI-assisted QA, human validation | Test cases approved before tests; red → green commits; reviewer agent + human review per PR | 12 |
| Learning from AI failures | `AI_LOG.md` entries that link to the rule or hook they changed | 12 |
| Architecture, trade-offs | `docs/architecture.md`, `docs/decisions/ADR-*.md` | 3, 15 |
| Testing, reliability | Vitest with coverage gates, property tests, Playwright smoke, CI on every PR | 9, 10 |
| Security | Validation, owner scoping (404), hashed passwords and sessions, no secrets, SAST + dependency + secret scans | 6, 10 |
| Deployment, documentation | Live demo link; reproducible setup (this file); compose file for local services | 8, 14 |
| Git and review | First commit README only; everything else via PRs with merge commits; protected `main`; `CODEOWNERS` | 5, 12 |

**Four audit traps to avoid from day one:**
1. **Prompt-injection text** committed anywhere (evals, fixtures, docs). It caps the audit's
   Permissions & Secrets score at 2. Store injection test payloads **base64-encoded** and describe them in words.
2. **AI config committed straight to `main`.** It caps Git & Review at 2. The kit arrives through a PR (Step 2).
3. **Plugins or MCP servers in committed config.** Keep none, so the MCP & Plugins parameter is N/A.
   Remove the code-review plugin from `claude-review.yml`.
4. **Stale references.** Every path in `CLAUDE.md` must exist. `scripts/check-ai-config.mjs` enforces this in CI.

---

## 3. Decisions locked since the backend docs were written

| Topic | Now | Was | Action |
|---|---|---|---|
| Auth | Email + password (argon2id); API-owned **opaque session tokens** (SHA-256 hash in `sessions`); guests get a session too | Google sign-in; Next.js mints a 5-min HS256 JWT with `jose` | Drop `jose`, `WEB_JWT_SECRET`, `API_JWT_SECRET`, `GOOGLE_*`. Add `@node-rs/argon2`. Rewrite ADR-004. |
| Retention | **Files** deleted right after extraction (24 h backstop); **detail** (facts, estimates, chat) 7 days, or 30 if the user opts in; **summary** row 180 days | Files 24 h; claim 30 days | Env names in 6.4; see `docs/reference/nest-plan/05-schemas-and-data.md` |
| History | `GET /claims` list; `GET /claims/:id` returns `view: 'full' \| 'summary'` | None | New issues in the build plan |
| Web app | Built on Day 4 from the Figma screens | Placeholder | Step 5 |
| Cost | **Free tiers only**, for both the AI model and hosting | Paid Claude API, Azure | Section 3.1; ADR-005 |

**Still open; decide before Day 1, or the default applies:**

| Decision | Default if you don't decide |
|---|---|
| Ask for the **policy schedule** (1–3 pages) instead of the 62-page wording | **Yes**: cheaper, faster, fewer quotes to verify; plan identified by UIN |
| Summary retention | 180 days |
| Verdict thresholds | As in `05-schemas-and-data.md` ("Verdict" paragraph) |
| "Forgot password?" | Hidden unless Day 4 finishes early (needs an email provider) |
| Public or private GitHub repo | **Private** until judging; public makes CodeQL/dependency review free, but nothing requires it |
| Second reviewer for PRs | Solo is fine; ask a colleague only to *review*, never to write code (the rules forbid multi-employee builds) |

Record each decision as a one-paragraph ADR when you make it.

### 3.1 The free-only stack (decided 25 Oct)

| Part | Free choice | Limits that shape the design | Was |
|---|---|---|---|
| Runtime AI | **Google Gemini API, free tier**: `gemini-3.8-flash` extracts facts; `gemini-3.5-flash-lite` runs the chat and nightly evals | Only Flash and Flash-Lite models are free. Google doesn't publish free daily limits; they're shown per project in AI Studio and reset at midnight Pacific. In September 2026 developers reported about **20 requests/day for 3.x Flash** and **500/day for Flash-Lite**, so check yours on day 0. **Free-tier content is used to improve Google's products, and human reviewers may read it.** | Claude Sonnet/Haiku, paid API |
| API hosting | **Render** free web service (Docker) | 512 MB RAM, 0.1 CPU; **sleeps after 15 min idle, about 1 min to wake**; 750 instance-hours/month per workspace; local disk is wiped on restart; no static outbound IP | Azure Container Apps |
| Web hosting | **Vercel** Hobby | Functions run at most 300 s; **request body at most 4.5 MB**; personal, non-commercial use | — |
| Database + files | **MongoDB Atlas M0** | 0.5 GB storage; 100 ops/s; 500 connections; pauses after 30 days with no connections | Atlas + Azure Blob |
| CI | GitHub Actions | Private repos get a monthly minute allowance on the Free plan; public repos are free | same |
| Claude review in CI | `claude-code-action` with **`CLAUDE_CODE_OAUTH_TOKEN`** (made with `claude setup-token`) | Uses your Claude subscription's usage, not API billing | `ANTHROPIC_API_KEY` |
| Dev tool | Claude Code on your own account | Unchanged: it's how you build, not part of the product | — |

**Design changes this forces** (each one gets a test, and the ADR explains it):

1. **Files don't stay.**
   - Uploads are capped at **4 MB**, because Vercel rejects bodies over 4.5 MB.
   - Phone photos are resized in the browser (longest side ≤ 2000 px, JPEG) before upload.
   - File bytes live in a MongoDB `documentFiles` collection: one document per file, under the 16 MB BSON limit.
   - They're deleted **right after extraction**, with a 24 h TTL as the backstop.
   - That removes Azure Blob, Azurite and the retention sweeper. In `docs/reference/nest-plan/05-schemas-and-data.md`,
     `blobName`/`blobExpiresAt`/`blobDeletedAt` become `fileId`/`fileExpiresAt`/`fileDeletedAt`.
   - Screen copy changes from "Files auto-deleted in 7 days" to "Files deleted right after reading".
2. **The product still works when the AI doesn't.**
   - A 429 or outage from Gemini returns `LLM_UNAVAILABLE` with "Today's free AI limit is used up".
   - The user can then **type the facts in** (source `user-stated`), and the rules engine runs as normal.
   - The chat falls back to templated replies built from the remedy catalog.
   - Sample cases never call the AI.
3. **A per-user AI quota** stops one visitor from using up the project's daily limit
   (`AI_DAILY_EXTRACTIONS_PER_USER`, `AI_DAILY_MESSAGES_PER_USER`). Going over returns `429 AI_QUOTA_EXCEEDED`.
4. **Cold starts are handled on screen.**
   - The landing page wakes the API on load: a server-side `/health` call, fire-and-forget.
   - Pages that need the API show "Waking the server, up to a minute…".
   - During judging (2–5 Nov) you can add a scheduled GitHub Action that pings `/health` every 10 minutes.
     One always-on service uses about 744 of the 750 free hours. Check Render's terms first.
5. **The consent screen (02) tells the truth about the free tier:** "Your documents are read by Google Gemini
   (free tier). Google may use them to improve its products, and people may review them. This is a demo:
   upload only the sample or made-up documents." A real launch would need Gemini's paid tier, whose content
   is not used for training. Record this in `docs/compliance.md`.
6. **The LLM adapter switches provider; the architecture doesn't.**
   - `GeminiLlmService` implements the same abstract `LlmService`.
   - Extraction uses JSON-schema structured output generated with `z.toJSONSchema()` from the same flat,
     all-required `LlmExtractionSchema`.
   - PDFs and images are sent as inline data.
   - Quote verification in code is unchanged.
   - Rewrite `docs/reference/nest-plan/06-llm-integration.md` for Gemini, checking field names against the current
     `@google/genai` docs. Contract tests replay recorded Gemini responses, so CI never calls Gemini.

Sources (read 25 Oct 2026):
- Gemini: [pricing](https://ai.google.dev/gemini-api/docs/pricing), [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits), [reported daily limits](https://agentdeals.dev/gemini-api-pricing-changes)
- Hosting: [Render free tier](https://render.com/docs/free), [Vercel function limits](https://blog.vercel.com/docs/functions/limitations), [Vercel Hobby](https://vercel.com/docs/plans/hobby), [hosting free-tier comparison](https://agentdeals.dev/hosting-free-tier-comparison-2026)
- Database: [Atlas M0 limits](https://mongodb.com/docs/atlas/reference/free-shared-limitations/)
- CI: [Claude Code GitHub Actions](https://code.claude.com/docs/en/github-actions)

---

## 4. Before you start

### 4.1 Tools (versions as of 22 Oct 2026)

| Tool | Version | Check |
|---|---|---|
| Node.js | **24.22.1** (`.nvmrc` says `24`) | `node -v` |
| pnpm | **12.14.0** (pinned in `packageManager`) | `pnpm -v` |
| Git + GitHub CLI | any recent | `gh auth status` |
| Docker Desktop | any recent | `docker compose version` |
| gitleaks | v8.19+ (for `gitleaks git`) | `gitleaks version` |
| Claude Code | current | `claude --version` |

Library pins live in `docs/reference/nest-plan/01-stack-decisions.md`. The ones people get wrong:

- **TypeScript stays `~6.0.2`.** 7.x breaks typescript-eslint and the Nest CLI.
- **NestJS `^12.2.0`** in ESM mode.
- **Vitest `^5.0.5`**, never Jest.
- **Google Gen AI SDK (`@google/genai`).** Pin the version `pnpm add` resolves. Check its docs for the
  current structured-output and inline-file field names before writing the adapter.

### 4.2 Accounts and services

| Service | Setup | Why it matters |
|---|---|---|
| **Claude Code, your own account** | See 4.3. Never the lead's account. | Hackathon rule: participants manage their own AI tools. Audit check 10.8. |
| **Google AI Studio** | Create a project `claimsense` and an API key. **Don't attach a billing account**, so it can't cost money. Note the free limits shown for your project. | Runtime AI. The rate-limit page is your usage tracking (audit checks 6.8 and 11.2). |
| **GitHub** | Personal repo `claimsense`, private | |
| **MongoDB Atlas** | Free M0 cluster in **Mumbai** if it's offered for free clusters (otherwise the nearest free region). DB user with `readWrite` on `claimsense` only and a long random password. Network access: your IP, plus `0.0.0.0/0` for Render, which has no static outbound IP. | Database and temporary file storage (local dev uses Docker) |
| **Render** | Sign up with GitHub; no card needed for the free tier | API hosting (section 14) |
| **Vercel** | Hobby account, signed up with GitHub | Web hosting (section 14) |

Secrets go only into your local `.env` and the host's secret settings. They never go in the repo,
the ZIP, chat with Claude, or screenshots.

### 4.3 Use your own Claude account without touching the lead's login

VS Code's Claude Code stays signed in to your lead's account. Run all hackathon work from a terminal
with a separate config folder.

```bash
# macOS / Linux: add to ~/.zshrc or ~/.bashrc
alias claude-hack='CLAUDE_CONFIG_DIR="$HOME/.claude-hackathon" claude'
```

```powershell
# Windows PowerShell: add to $PROFILE
function claude-hack { $env:CLAUDE_CONFIG_DIR = "$HOME\.claude-hackathon"; claude @args }
```

1. Run `claude-hack`, then `/login` with **your** account.
2. Run `/status` and check the email shown is yours. Do this at the start of every session.
3. Never run `/logout` in the VS Code extension.

---

## 5. Step 1: create the repo the audit-safe way

The first commit on `main` contains **only** `README.md` and `.gitignore`. Everything else, including
the AI kit, arrives through pull requests, so the history shows AI config being reviewed.

```bash
mkdir claimsense && cd claimsense
git init -b main
# README.md: product name, one-paragraph problem statement, "Setup: see docs/setup.md (coming in PR #1)",
# and the prior-work line: "No pre-existing work: all planning, design and code date from 1–30 Oct 2026."
# .gitignore: the kit's .gitignore plus the additions in Step 2
git add README.md .gitignore
git commit -m "chore: initial commit"
gh repo create claimsense --private --source=. --push
```

Protect `main` with a ruleset. In GitHub: Settings → Rules → Rulesets → New branch ruleset, target `main`:

- [x] Restrict deletions
- [x] Block force pushes
- [x] Require a pull request before merging. Required approvals: **0** (you're solo and can't approve your own PR; the audit marks this Partial, which is fine)
- [x] Require status checks to pass: `checks`, `security`, `web` (add them once CI has run once)
- Bypass list: **empty**
- Allowed merge method: **merge commit only** (squash erases the red/green commits)

Turn on Settings → Code security → **Secret scanning** and **Push protection** if your plan offers them for private repos.

---

## 6. Step 2: AI kit v3, as PR #1

```bash
git switch -c chore/ai-kit
cp -r ../claimsense-ai-kit/. .
mkdir -p docs/backend && cp -r ../claimsense-backend-docs/docs/reference/nest-plan/. docs/reference/nest-plan/
```

### 6.1 Edits to existing kit files

1. Apply the 21 edits in `docs/reference/nest-plan/08-ai-kit-changes.md`, **except** these superseded rows:
   - `.env.example`: use 6.4 below instead.
   - "route tests mint real tokens with `signTestToken()`" becomes "route tests create a session through
     `createTestSession(app, 'user-a')`".
   - ADR-004 becomes "API-owned opaque sessions, email + password, guest sessions for sample cases".
2. Fix stale text in the copied backend docs, so `CLAUDE.md` never points at wrong information:
   - In `docs/reference/nest-plan/04-api.md`, replace the **Auth** paragraph with the session model, and add the auth,
     history and `DELETE /me` routes listed at the end of `05-schemas-and-data.md`.
   - In `docs/reference/nest-plan/03-setup-and-config.md` and `01-stack-decisions.md`, delete `jose` from the install
     line and the auth row; point to this file.
   - In `docs/reference/nest-plan/07-tdd-build-order.md`, replace the "When" column with the dates in section 13.
3. `.github/workflows/claude-review.yml`: remove the plugin line, so the review uses
   `anthropics/claude-code-action` with a plain prompt. **Pin every third-party action to a commit SHA**,
   and give each workflow `permissions:` with only what it needs (`contents: read`,
   `pull-requests: write`).
4. `.claude/agents/code-reviewer.md`: set `model: opus`. `qa-agent.md`: set `model: sonnet`.
   This is the model-per-task evidence for audit check 6.4.
5. Every `.claude/skills/*/SKILL.md`:
   - Add `allowed-tools:` (e.g. `Read, Grep, Glob, Edit, Write, Bash(pnpm test:*), Bash(pnpm exec vitest:*)`).
   - Make the last step "Verify: run `pnpm lint && pnpm typecheck && pnpm test` and paste the summary".
   - `tdd` creates commits, so keep it user-invoked: add `disable-model-invocation: true`.
6. Add `packages/rules/CLAUDE.md` (about 20 lines):
   - Pure engine: no I/O, no clock, no SDKs (lint-enforced).
   - Money in paise, dates as `YYYY-MM-DD`, percentages in basis points.
   - Values only from plan config with a `ClauseRef`.
   - 100/95 coverage gate.
   - Expected amounts worked out by hand, with the arithmetic in a comment.
7. `CLAUDE.md`:
   - Add a **"Where to find what"** map pointing to `docs/setup.md`, `docs/architecture.md`, `docs/prd.md`,
     `docs/rules-spec.md`, `docs/test-cases.md`, `docs/api.md`, `docs/reference/nest-plan/`, `docs/decisions/`,
     `docs/ai-usage.md`, `docs/ai-policy.md`.
   - Add **session hygiene**: one issue per session; `/clear` between issues; plan mode for anything
     touching more than 3 files; `/compact` when context passes half.
   - Keep it **≤ 200 lines**.

### 6.2 `.gitignore` additions

```gitignore
# personal / local AI config
CLAUDE.local.md
.claude/settings.local.json
# the audit prompt and its reports stay local
AI_AUDIT_PROMPT.md
ai-audit/
# test + build output
playwright-report/
test-results/
```

### 6.3 `.claude/settings.json` (replaces the kit's)

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "allow": [
      "Bash(pnpm test:*)", "Bash(pnpm lint:*)", "Bash(pnpm typecheck:*)", "Bash(pnpm cases:*)",
      "Bash(pnpm build:*)", "Bash(pnpm format:*)", "Bash(pnpm --filter:*)",
      "Bash(pnpm exec vitest:*)", "Bash(pnpm exec eslint:*)", "Bash(pnpm exec tsc:*)",
      "Bash(pnpm exec playwright test:*)", "Bash(node scripts/check-ai-config.mjs)",
      "Bash(git status:*)", "Bash(git diff:*)", "Bash(git log:*)", "Bash(git branch:*)",
      "Bash(git switch:*)", "Bash(git add:*)", "Bash(git commit:*)"
    ],
    "ask": [
      "Bash(git push:*)", "Bash(git reset:*)", "Bash(git rebase:*)", "Bash(git checkout:*)",
      "Bash(pnpm add:*)", "Bash(pnpm remove:*)", "Bash(pnpm install:*)", "Bash(pnpm eval:*)",
      "Bash(gh:*)", "Bash(docker:*)", "Bash(curl:*)",
      "Edit(./.github/**)", "Edit(./.claude/**)", "Edit(./CLAUDE.md)", "Edit(./**/CLAUDE.md)",
      "Edit(./pnpm-workspace.yaml)", "Edit(./lefthook.yml)", "Edit(./config/plans/**)"
    ],
    "deny": [
      "Read(./.env)", "Read(./.env.local)", "Read(./.env.development)", "Read(./.env.production)",
      "Read(./**/.env)", "Read(./**/.env.local)",
      "Bash(git push --force:*)", "Bash(git push -f:*)", "Bash(rm -rf /:*)"
    ]
  },
  "hooks": {
    "PreToolUse": [
      { "matcher": "Edit|Write|MultiEdit",
        "hooks": [{ "type": "command", "command": "node \"${CLAUDE_PROJECT_DIR}/.claude/hooks/guard-writes.mjs\"" }] },
      { "matcher": "Bash",
        "hooks": [{ "type": "command", "command": "node \"${CLAUDE_PROJECT_DIR}/.claude/hooks/guard-bash.mjs\"" }] }
    ],
    "PostToolUse": [
      { "matcher": "Edit|Write|MultiEdit",
        "hooks": [{ "type": "command", "command": "node \"${CLAUDE_PROJECT_DIR}/.claude/hooks/check-after-edit.mjs\"" }] }
    ]
  }
}
```

- `.env.example` is deliberately **not** denied, so Claude can keep it in sync. `guard-writes.mjs` still
  blocks writes to real `.env` files.
- **Approval points that always need you** (copy this list into `docs/ai-policy.md`): push, merge,
  dependency changes, CI/agent-config edits, plan-config edits, live evals (they cost money), deploys,
  and anything that deletes data.
- If your Claude Code version supports the sandbox (`/sandbox`), turn it on and commit the setting it
  writes (audit checks 5.9 and 5.10). Check the docs for the current key names.

### 6.4 `.env.example` (replaces the kit's)

```dotenv
# Copy to .env (and apps/web/.env.local for the WEB block). Never commit real values.

# ---- API ----
NODE_ENV=development
PORT=4000
LOG_LEVEL=info
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=claimsense
GEMINI_API_KEY=
GEMINI_MODEL_EXTRACT=gemini-3.8-flash
GEMINI_MODEL_CHAT=gemini-3.5-flash-lite
AI_DAILY_EXTRACTIONS_PER_USER=6
AI_DAILY_MESSAGES_PER_USER=20
FILE_TTL_HOURS=24
LLM_TIMEOUT_MS=120000
SESSION_TTL_DAYS=7
DETAIL_TTL_DAYS_STANDARD=7
DETAIL_TTL_DAYS_EXTENDED=30
SUMMARY_TTL_DAYS=180
GUEST_TTL_HOURS=24
MAX_UPLOAD_MB=4
MAX_FILES_PER_CLAIM=8

# ---- WEB (apps/web/.env.local) ----
API_BASE_URL=http://localhost:4000
SESSION_COOKIE_NAME=cs_session
```

The API's `env.schema.ts` (Zod) must reject a missing or empty required value at boot. That's test `TC-API-CORE-06`.

### 6.5 New file: `.claude/hooks/guard-bash.mjs`

This blocks destructive or secret-leaking shell commands deterministically (audit checks 4.4, 4.5 and 4.9).
It was tested against 25 inputs: 15 blocked and 10 allowed, including `--force-with-lease`,
`rm -rf dist coverage` and `cat .env.example`.

```js
#!/usr/bin/env node
// PreToolUse hook for Bash. Exit 2 blocks the command; stderr goes back to Claude.
import { readFileSync } from 'node:fs';

let cmd = '';
try {
  cmd = String(JSON.parse(readFileSync(0, 'utf8'))?.tool_input?.command ?? '');
} catch {
  process.exit(0); // never block on a parse problem in the hook itself
}

const SAFE_RM = /^(\.\/)?([\w.-]+\/)*(dist|coverage|node_modules|\.next|playwright-report|test-results)\/?$/;
const problems = [];

for (const part of cmd.split(/&&|\|\||;|\n/)) {
  const s = part.trim();
  if (/^git\s+push\b/.test(s)) {
    if (/\s(--force(?!-with-lease)|-f)(\s|$)/.test(s)) problems.push('force-push');
    if (/\s(origin\s+)?(HEAD:)?(main|master)(\s|$)/.test(s)) problems.push('push to main (open a PR instead)');
  }
  if (/--no-verify\b/.test(s)) problems.push('--no-verify skips the secret scan and tests');
  const rm = s.match(/^rm\s+(.*)$/);
  if (rm) {
    const args = rm[1].split(/\s+/);
    const flags = args.filter((a) => a.startsWith('-')).join('');
    const targets = args.filter((a) => !a.startsWith('-'));
    if (/r/i.test(flags) && /f/.test(flags) && !targets.every((t) => SAFE_RM.test(t)))
      problems.push(`rm -rf outside build folders (${targets.join(' ')})`);
  }
  if (/\b(cat|less|more|head|tail|grep|source|\.)\s+[^|]*\.env(\.(?!example)\w+)?(\s|$)/.test(s))
    problems.push('reading a real .env file');
  if (/\b(dropDatabase|deleteMany\(\s*\{\s*\}\s*\)|\.drop\(\s*\))/.test(s)) problems.push('dropping MongoDB data');
  if (/\baz\s+storage\s+(container|blob)\s+delete/.test(s)) problems.push('deleting Azure storage');
  if (/\bgh\s+(repo\s+delete|pr\s+merge)/.test(s)) problems.push('gh repo delete / pr merge (a human merges)');
  if (/\b(curl|wget)\b.*\|\s*(sh|bash|zsh)\b/.test(cmd)) problems.push('piping a download into a shell');
}

if (problems.length) {
  console.error(`Blocked by .claude/hooks/guard-bash.mjs: ${[...new Set(problems)].join('; ')}. Ask the human to do this if it is really needed.`);
  process.exit(2);
}
process.exit(0);
```

Add its test cases to `docs/ai-usage.md` under "Guardrails, and how they were tested". At minimum:

```bash
echo '{"tool_input":{"command":"git push --force origin feat/x"}}' | node .claude/hooks/guard-bash.mjs; echo "exit $?"   # 2
echo '{"tool_input":{"command":"rm -rf dist coverage"}}'          | node .claude/hooks/guard-bash.mjs; echo "exit $?"   # 0
```

### 6.6 New file: `scripts/check-ai-config.mjs` (runs in CI; audit check 10.5)

It checks that:
- `settings.json` parses and doesn't enable bypass mode;
- every hook script it references exists;
- every skill and agent has `name` and `description`;
- `CLAUDE.md` is ≤ 200 lines;
- every path `CLAUDE.md` mentions exists.

Run against the kit today, it correctly reports eight missing paths (`docs/prd.md`,
`docs/rules-spec.md`, `docs/architecture.md`, `docs/api.md`, `docs/decisions/`, `packages/rules`,
`packages/shared`, `config/remedies.json`). Those are exactly the files PRs #1 and #2 must create.

```js
#!/usr/bin/env node
// CI check for the AI setup: settings parse, hook scripts exist, skills and agents have
// valid frontmatter, CLAUDE.md stays short, and paths it mentions exist.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] ?? '.';
const errors = [];
const read = (p) => readFileSync(join(root, p), 'utf8');

// 1. settings.json parses and every hook command points at a real file
let settings = {};
try { settings = JSON.parse(read('.claude/settings.json')); } catch (e) { errors.push(`settings.json: ${e.message}`); }
for (const groups of Object.values(settings.hooks ?? {}))
  for (const g of groups) for (const h of g.hooks ?? []) {
    const m = String(h.command).match(/\.claude\/hooks\/[\w.-]+/);
    if (m && !existsSync(join(root, m[0]))) errors.push(`hook script missing: ${m[0]}`);
  }
if (JSON.stringify(settings).includes('bypassPermissions')) errors.push('settings.json enables bypassPermissions');

// 2. skills and agents have name + description frontmatter
const front = (p) => (read(p).match(/^---\n([\s\S]*?)\n---/) ?? [])[1] ?? '';
const skillsDir = join(root, '.claude/skills');
for (const d of existsSync(skillsDir) ? readdirSync(skillsDir) : []) {
  const fm = front(`.claude/skills/${d}/SKILL.md`);
  if (!/^name:\s*\S/m.test(fm) || !/^description:\s*\S/m.test(fm)) errors.push(`skill ${d}: missing name/description`);
}
const agentsDir = join(root, '.claude/agents');
for (const f of existsSync(agentsDir) ? readdirSync(agentsDir) : []) {
  const fm = front(`.claude/agents/${f}`);
  if (!/^name:\s*\S/m.test(fm) || !/^description:\s*\S/m.test(fm)) errors.push(`agent ${f}: missing name/description`);
}

// 3. CLAUDE.md is short and its concrete paths exist
const claude = read('CLAUDE.md');
const lines = claude.split('\n').length;
if (lines > 200) errors.push(`CLAUDE.md has ${lines} lines (limit 200)`);
const paths = [...claude.matchAll(/`([\w@.-]+\/[\w./@-]+)`/g)].map((m) => m[1])
  .filter((p) => !/[<>*…]/.test(p) && !p.startsWith('@') && !p.includes('://'));
for (const p of new Set(paths)) if (!existsSync(join(root, p))) errors.push(`CLAUDE.md mentions missing path: ${p}`);

if (errors.length) { console.error(errors.map((e) => `✗ ${e}`).join('\n')); process.exit(1); }
console.log(`✓ AI config OK (CLAUDE.md ${lines} lines, ${paths.length} paths checked)`);
```

To make PR #1 green, create stubs now: `docs/prd.md` (export the MVP PRD from Claude Docs),
`docs/rules-spec.md`, `docs/architecture.md`, `docs/api.md` (copy of `docs/reference/nest-plan/04-api.md` or a link
to it), `docs/decisions/ADR-000-template.md`. The package paths appear in PR #2.

### 6.7 Git hooks: `lefthook.yml` (audit checks 4.2, 4.3 and 4.8)

```yaml
pre-commit:
  parallel: true
  commands:
    secrets:
      run: gitleaks git --pre-commit --staged --redact --no-banner   # check `gitleaks git --help` for your version
    lint:
      glob: "*.{ts,tsx,js,mjs}"
      run: pnpm exec eslint --fix {staged_files}
      stage_fixed: true
    format:
      glob: "*.{json,md,yml,yaml,css}"
      run: pnpm exec prettier --write {staged_files}
      stage_fixed: true
pre-push:
  commands:
    ai-config:
      run: node scripts/check-ai-config.mjs
    typecheck:
      run: pnpm typecheck
    test:
      run: pnpm test
```

Install it in PR #2, once `package.json` exists: `pnpm add -Dw lefthook && pnpm exec lefthook install`.
If pnpm blocks its install script, run `lefthook install` by hand, or add `lefthook: true` to `allowBuilds`.

### 6.8 Review and governance files

**`.github/CODEOWNERS`:**

```
*                    @<your-github-username>
/CLAUDE.md           @<your-github-username>
**/CLAUDE.md         @<your-github-username>
/.claude/            @<your-github-username>
/.github/            @<your-github-username>
/docs/ai-*.md        @<your-github-username>
/config/plans/       @<your-github-username>
```

**`.github/pull_request_template.md`:**

```markdown
## What and why
Closes #

## Test cases
- [ ] Test cases written in `docs/test-cases.md` and approved **before** tests (IDs: TC-…)
- [ ] Red commit(s) pushed before green: <sha> → <sha>

## Verification (paste summaries)
- [ ] `pnpm lint && pnpm typecheck && pnpm test:cov`
- [ ] `pnpm cases` (if rules/config changed)
- [ ] Ran the `code-reviewer` agent; findings fixed or answered below
- [ ] I read every line of the diff and can explain it

## AI involvement
Model / agent / skill used:
What the AI got wrong (and the `AI_LOG.md` entry, if any):

## Safety
- [ ] No secrets, real PHI or injection text added
- [ ] Ownership tests (other user → 404) still pass
```

**`.github/dependabot.yml`:** weekly `npm` updates (root `/`) plus `github-actions`, with
`open-pull-requests-limit: 3`. Check that Dependabot can read the pnpm 12 lockfile. If it can't,
keep only `github-actions` and rely on `pnpm audit` in CI.

### 6.9 New docs in this PR

| File | Contents (short) |
|---|---|
| `docs/ai-policy.md` | Owner (you); tools allowed; **your own account only**; data classes (synthetic only; `.env` denied); MCP (none committed; adding one needs a PR + inventory row); no bypass modes; every AI change goes through a PR you read; `Co-Authored-By` trailer on AI commits; approval-point list from 6.3; review cadence (run the audit prompt daily until submission); licence/IP (no pasted third-party code without checking its licence); transcript retention (check your Claude account's data settings) |
| `docs/compliance.md` | DPDP Act: health data is personal data; consent per purpose; deletion on request; enforceable from 13 May 2027, followed now anyway. IRDAI: self-help estimate only; never files claims, sells policies or takes fees; labels never say "approved". Documents go to Google Gemini's **free tier**, which may use them to improve Google's products and lets people review them. So: synthetic documents only, the consent screen says so, and a real launch needs the paid tier. Accepted risk: `409 EMAIL_TAKEN` reveals that an account exists. |
| `docs/ai-usage.md` | The kit's file plus sections for: lifecycle table (define, design, build, test, review, document) with links to commits and PRs; context engineering; skills and agents; guardrails and their tests; model per task; session hygiene; cost (free tiers only: the AI Studio rate-limit page, `/cost` per Claude Code session, token counts logged per runtime AI call); how AI output was validated |
| `docs/setup.md` | This file |

Commit, push, open PR #1 and merge with a merge commit once CI exists (PR #2). For this first PR, CI
won't have run yet. That's expected, so record it in the PR body.

```bash
git add -A && git commit -m "chore(ai): add AI kit v3, docs and guardrails" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
git push -u origin chore/ai-kit && gh pr create --fill
```

---

## 7. Step 3: scaffold the workspace, as PR #2

Follow `docs/reference/nest-plan/03-setup-and-config.md` from "The commands" onward, with these differences:

```bash
git switch main && git pull && git switch -c chore/scaffold
nvm install 24 && nvm use 24 && echo 24 > .nvmrc
npm install -g pnpm@12.14.0

# (03's mkdir, root devDependencies and Nest scaffold, unchanged)

# API dependencies: same as 03 but WITHOUT jose, and WITH argon2
pnpm --filter @claimsense/api add @node-rs/argon2
#   check the current version, and that it has a prebuilt binary for your OS

pnpm add -Dw lefthook && pnpm exec lefthook install
```

- **Copy as-is from 03:** `pnpm-workspace.yaml`, root `package.json`, `tsconfig.base.json`, the per-package
  `tsconfig.json`/`tsconfig.build.json`, both Vitest configs, `eslint.config.mjs`, the Dockerfile and
  `.dockerignore`.
- **Changes to 03's files:**
  - In `test/setup/env.ts`, delete the `API_JWT_SECRET` line.
  - In `eslint.config.mjs`, remove `apps/web/**` from `ignores` after Step 5.
  - Add `"check:ai": "node scripts/check-ai-config.mjs"` and
    `"e2e": "pnpm --filter @claimsense/web run e2e"` to the root scripts.
- **Install the Gemini SDK in Step 3 too:** `pnpm --filter @claimsense/api add @google/genai`, and pin what
  it resolves.
- **Drop from 03's install line:** `@azure/storage-blob` and `jose`.
- **In `eslint.config.mjs`'s restricted imports:** replace `@anthropic-ai/sdk` and `@azure/storage-blob` with
  `@google/genai`, and `@anthropic-ai/*` with `@google/*`.

**Spike tests (red first, then green):**
- `TC-SMOKE-01`: Nest DI with decorator metadata resolves in `Test.createTestingModule`.
- `TC-SMOKE-02`: `GET /health` → 200 against mongodb-memory-server.
- `TC-SMOKE-03`: the API imports a `shared` schema through the alias.

**Superseded (ADR-001):** Vitest is the only runner, never Jest, and the one-night build has no Nest DI.
The old escape hatch in `01-stack-decisions.md` (CommonJS + Jest) does not apply.

---

## 8. Step 4: local services and `.env`

**`docker-compose.dev.yml`** (committed; local dev only):

```yaml
services:
  mongo:
    image: mongo:8.2              # pin the exact tag/digest after the first pull
    ports: ["27017:27017"]
    volumes: [mongo-data:/data/db]
volumes:
  mongo-data: {}
```

```bash
docker compose -f docker-compose.dev.yml up -d
cp .env.example .env            # fill GEMINI_API_KEY yourself; never paste it into Claude
pnpm dev                        # API on :4000
curl localhost:4000/health      # {"status":"ok",...}
```

Tests don't need Docker. They use mongodb-memory-server (files are stored in Mongo too), `FakeLlmService`
and `FixedClock`.

---

## 9. Step 5: the web app (skeleton in PR #2, screens on Day 4)

Scaffold Next.js (App Router, TypeScript, Tailwind) into `apps/web`. Flag names change between
versions, so read `--help` first. Pin the version it resolves, and confirm it accepts TypeScript `~6.0.2`.

```bash
pnpm dlx create-next-app@latest --help
pnpm dlx create-next-app@<pinned> apps/web --ts --app --tailwind --src-dir --use-pnpm --skip-install
# package.json → "name": "@claimsense/web"; depend on "@claimsense/shared": "workspace:*"
pnpm --filter @claimsense/web add -D vitest @vitest/coverage-v8 @testing-library/react jsdom @playwright/test
```

**Rules for the web app** (put them in `apps/web/CLAUDE.md`):

- **The browser never calls the API.**
  - Server components and server actions call it through `src/lib/api.ts`, which is `server-only`.
  - The session token lives in an httpOnly, `Secure`, `SameSite=Lax` cookie named `SESSION_COOKIE_NAME`.
  - CORS stays off on the API.
- **Forms validate with the same Zod schemas from `@claimsense/shared`.** API errors map from `ErrorCode`
  to friendly text in one file.
- **Design tokens come from Figma:**
  - teal `#0E7A66`, ink `#12211E`, muted `#4A5B56`, background `#F6F7F5`, border `#DDE3DF`;
  - chips: pass `#E3F2EE`/`#095C4D`, warn `#FFF1DE`/`#8A4A06`, risk `#FDECEA`/`#8F1D14`;
  - font: Plus Jakarta Sans (`next/font`).
- **Name components after the Figma layers:** `Button`, `Chip`, `Card`, `Field`, `Toggle`, `Segmented`,
  `PayoutBar`, `Quote`, `FactRow`, `CheckRow`, `ClaimRow`.
- **Every result screen shows the disclaimer.** Labels never say "approved".
- **Uploads:** go through a server action, so Vercel's 4.5 MB body limit applies. Cap files at 4 MB, resize
  photos in the browser first, and show the limit next to the drop zone.
- **Free-tier states:**
  - "Waking the server…" while the API cold-starts.
  - "Today's free AI limit is used up: enter the facts yourself" on `LLM_UNAVAILABLE` or `AI_QUOTA_EXCEEDED`.
  - A manual fact form that uses the same Zod schemas.

**Routes, mapped to the Figma screens:**

| Route | Screen |
|---|---|
| `/` | 01 Landing |
| `/signup`, `/login` | 07 Sign up, 06 Log in |
| `/claims` | 08 My claims (history) |
| `/claims/new` | 02 Consent + setup |
| `/claims/[id]/facts` | 03 Upload + facts |
| `/claims/[id]` | 04 Estimate, with the 05 chat panel; the summary view when `view === 'summary'` |
| `/sample/[caseId]` | Guest session → sample claim → redirect to `/claims/[id]` |

**One Playwright smoke test** (audit check 8.9), `apps/web/e2e/sample-case.spec.ts`. Its `webServer`
starts the API with a `start:e2e` script (mongodb-memory-server, `FakeLlmService`),
so CI needs no secrets:
open `/` → "Try a sample case" → Case B estimate shows **"Likely partial"** and **₹2,05,800** →
twin-sharing (₹4,500/day) simulation shows ₹2,17,900 payable of ₹2,27,500 → "Delete my data" returns to `/`.

---

## 10. Step 6: CI (PR #2)

Start from the `ci.yml` in `docs/reference/nest-plan/03-setup-and-config.md` (job `checks`). Add two jobs, and pin
every action to a SHA:

```yaml
  security:
    runs-on: ubuntu-latest
    permissions: { contents: read }
    steps:
      - uses: actions/checkout@v6
      - name: SAST (Semgrep)
        run: pipx run semgrep scan --config p/typescript --config p/secrets --error --metrics=off
      - uses: pnpm/action-setup@v6
      - uses: actions/setup-node@v4
        with: { node-version-file: .nvmrc, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - name: Dependency audit
        run: pnpm audit --prod --audit-level high   # check that pnpm 12 supports `audit`; else use Dependabot alerts
      - name: AI config check
        run: node scripts/check-ai-config.mjs

  web:
    runs-on: ubuntu-latest
    permissions: { contents: read }
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v6
      - uses: actions/setup-node@v4
        with: { node-version-file: .nvmrc, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @claimsense/web run test
      - run: pnpm --filter @claimsense/web exec playwright install --with-deps chromium
      - run: pnpm e2e          # Playwright `webServer` starts the API in e2e mode + the web app
```

Also in this PR:

- **`nightly-evals.yml`:** apply the doc 08 fixes.
- **Live evals** use `GEMINI_API_KEY` as a repository secret. They run only on schedule or manual dispatch, never on PRs, and on Flash-Lite with at most 10 documents per run, to stay inside the free daily limit.
- **`claude.yml` and `claude-review.yml`:** use `claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}` instead of `anthropic_api_key`. Make the token with `claude setup-token` while signed in to **your** account, and set `--max-turns` in `claude_args` to cap usage.
- **Workflow permissions:** set `permissions:` at the top of every workflow (`contents: read` by default).
  `claude.yml` may push to **branches**, never to `main`; the ruleset enforces that.

**Day-0 definition of done.** All of these hold before any feature work:

- [ ] `pnpm build && pnpm lint && pnpm typecheck && pnpm test` pass locally
- [ ] `node scripts/check-ai-config.mjs` passes
- [ ] The two hook test commands in 6.5 give 2 and 0
- [ ] `docker build -f apps/api/Dockerfile .` works
- [ ] PR #2 is green on `checks`, `security` and `web`, and merged with a merge commit; then add those three as required checks in the ruleset
- [ ] `AI_LOG.md` has today's entries (e.g. "kit assumed Google sign-in; switched to sessions")

---

## 11. Final folder map

```
claimsense/
├─ README.md  CLAUDE.md  AI_LOG.md  .env.example  .gitignore  .nvmrc  lefthook.yml
├─ package.json  pnpm-workspace.yaml  pnpm-lock.yaml  tsconfig.base.json  eslint.config.mjs
├─ docker-compose.dev.yml
├─ .claude/   settings.json  hooks/{guard-writes,guard-bash,check-after-edit}.mjs
│             agents/{code-reviewer,qa-agent}.md
│             skills/{tdd,rules-test-generator,plan-config-extractor,conversation-eval,new-rule}/SKILL.md
├─ .github/   CODEOWNERS  pull_request_template.md  dependabot.yml
│             workflows/{ci,nightly-evals,claude,claude-review}.yml
├─ scripts/   check-ai-config.mjs
├─ apps/
│  ├─ api/    @claimsense/api   NestJS 12 ESM; tree in docs/reference/nest-plan/02-folder-structure.md
│  │          + modules/auth/ (signup, login, logout, sessions.repository, password.service)
│  │          + modules/claims/ list + summary view; modules/me/ (DELETE /me)
│  └─ web/    @claimsense/web   Next.js; src/app/(routes in section 9), src/components/{ui,claim}/,
│             src/lib/{api,session,errors}.ts, e2e/, CLAUDE.md
├─ packages/
│  ├─ shared/ @claimsense/shared   Zod schemas, ErrorCode, money/date primitives, api/*.ts
│  └─ rules/  @claimsense/rules    pure engine R1–R8 + CLAUDE.md
├─ config/    @claimsense/config   plans/*.json (+ drafts/), remedies.json
├─ fixtures/  @claimsense/fixtures cases/{A,B,B2,C,D}/  docs/ (synthetic only)
├─ evals/     conversations/CE-*.yaml (injection payloads base64-encoded)  extraction/golden/
└─ docs/      setup.md  prd.md  architecture.md  api.md  rules-spec.md  test-cases.md  TDD.md
              ai-usage.md  ai-policy.md  compliance.md  backend/01–08  decisions/ADR-00x-*.md
```

---

## 12. Daily workflow for every issue

1. **Issue.** A GitHub issue with acceptance criteria copied from `docs/prd.md`.
2. **New session.** `claude-hack`, then `/status`, then `/clear`. One issue per session.
3. **Test cases first.** Run `/tdd <issue>`. Claude drafts rows in `docs/test-cases.md`; **you** edit and
   approve them. Expected amounts are worked out by hand, with the arithmetic in a comment.
4. **Red.** Write failing tests, then commit `test(<area>): TC-… (red)`.
5. **Green.** Write code until the tests pass **without editing the tests**, then commit `feat(<area>): … (green)`.
6. **Refactor**, with the tests still green, then commit `refactor(<area>): …`.
7. **Review.**
   - Ask Claude to "use the code-reviewer agent", then "use the qa-agent".
   - Read every line of the diff yourself.
8. **PR.**
   - Push red and green together.
   - Fill in the PR template.
   - Let the Claude review workflow comment.
   - Fix what's real; reply to what isn't.
9. **Merge** with a merge commit. Delete the branch.
10. **Learn.** Each time the AI got something wrong, add one line to `AI_LOG.md`: what happened, how you
    caught it, and what changed (a rule in `CLAUDE.md`, a hook, a skill step or a test). Link the commit.

**Every AI-assisted commit ends with:**

```
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 13. Build plan, 25–30 Oct

Issue numbers and test IDs follow `docs/reference/nest-plan/07-tdd-build-order.md`. The new issues are marked ★.

| Day | Issues | Done when |
|---|---|---|
| **Sun 25 Oct** (today) | Steps 1–6: repo, PR #1 (kit), PR #2 (scaffold, CI, web skeleton) | Section 10 checklist all ticked |
| **Mon 26 Oct** | #1 shared schemas + config; #2 R1–R5; #3 R6–R8; #4 engine, verdict, sample cases, properties | `pnpm cases` green; rules coverage 100/95 |
| **Tue 27 Oct** | #5 API foundation; ★ auth (signup, login, logout, sessions, guest, lockout); #6 claims + scoping + retention + ★ history list and summary view + ★ `DELETE /me`; #7 upload; #8 quote verifier | Ownership 404 tests for every route; auth tests `TC-AUTH-*` |
| **Wed 28 Oct** | #9 Gemini adapter contract; #10 extract + facts + ★ manual fact entry + ★ per-user AI quota; #11 check, simulate, remedies, sample; #12 chat (templated replies first) | Case B end-to-end through the API with the fake LLM; one live Gemini extraction on a synthetic schedule; a 429 from Gemini falls back cleanly |
| **Thu 29 Oct** | ★ Web: screens 06/07 → 02 → 03 → 04/05 → 08; Playwright smoke; **deploy to Render + Vercel**; README demo link | Live link works for a guest sample case, including after a cold start |
| **Fri 30 Oct** | Polish; fill in the docs (section 15); run the audit prompt and fix findings; record the video; build and check the ZIP; **submit by about 18:00** | Submitted; no commits after |

**★ Auth test cases to approve on Tue 27 Oct** (starting list):
- `TC-AUTH-01` sign-up → 201; the password is stored only as an argon2id hash.
- `TC-AUTH-02` duplicate email (any case) → 409 `EMAIL_TAKEN`.
- `TC-AUTH-03` password under 8 characters or without a number → 400.
- `TC-AUTH-04` wrong password and unknown email → the same 401 `AUTH_INVALID`.
- `TC-AUTH-05` 5 failures → 423 `ACCOUNT_LOCKED` for 15 min (`FixedClock`).
- `TC-AUTH-06` logout → the token now gives 401.
- `TC-AUTH-07` expired session → 401; a session near expiry slides forward.
- `TC-AUTH-08` the raw token is never stored, only its SHA-256.

**If you fall behind, cut in this order.** Note each cut in an ADR or `AI_LOG.md`.
1. "Forgot password?" (hide the link)
2. History filters, search and summary tiles (keep the table and Open)
3. LLM reply composer in the chat (keep the classifier, what-if and catalog remedies as templates)
4. The separate injection-screening call (keep the warnings and mandatory confirmation)
5. The retention sweeper (keep the TTL indexes and synchronous delete)

**Never cut:**
- ownership 404 tests;
- rules coverage;
- quote verification;
- consent and disclaimers;
- delete my data;
- the Playwright smoke test.

---

## 14. Deployment (Day 4)

Everything is on a free tier (section 3.1). Record it as ADR-005.

| Part | Where | How |
|---|---|---|
| API | **Render** free web service | New Web Service → this repo → runtime **Docker**, Dockerfile path `apps/api/Dockerfile`, instance type **Free**, health check path `/health`. Env vars from the API block of `.env.example`, with real values. Check that the Free instance type is offered for Docker services when you create it. |
| Web | **Vercel** Hobby | Import the repo; root directory `apps/web`; framework Next.js. Set `API_BASE_URL` to the Render URL and `SESSION_COOKIE_NAME`. Function max duration 300 s, which covers a synchronous extraction (`LLM_TIMEOUT_MS=120000`) plus a cold start. |
| Database + files | **Atlas M0** | Connection string as `MONGODB_URI` on Render only. The web app never touches the database. |
| AI | **Gemini free tier** | `GEMINI_API_KEY` on Render only |

After the first deploy:

- Open the live site in a private window after 20 minutes of inactivity. Confirm the "Waking the server…"
  state appears and the sample case loads.
- Run one real extraction on a synthetic schedule. Note the AI Studio usage, and that a second account can't
  go past the per-user quota.

Rules for all of it:

- **Secrets** live only in the host's secret settings.
- **Health check** on `/health`.
- **Seed nothing:** sample cases come from `@claimsense/fixtures`.
- **Judges' access:** a guest "Try a sample case" needs no account. If you give judges a login, share it
  separately through the submission process, never in the repo.

---

## 15. Submission checklist (30 Oct)

**The product works:**
- [ ] Live link works for a guest sample case
- [ ] Sign up, upload a synthetic schedule, confirm facts, estimate, chat, history and delete all work end to end

**Docs the submission guide asks for:**

| Guide asks for | File |
|---|---|
| Product description, problem statement, demo link | `README.md` |
| Architecture, stack, technical decisions, limitations, dependencies | `docs/architecture.md`, `docs/decisions/`, `docs/reference/nest-plan/01`, README "Limitations" |
| How AI was used, workflow, context engineering, skills, agents, instructions, guardrails | `docs/ai-usage.md`, `CLAUDE.md`, `.claude/`, `AI_LOG.md` |
| AI-assisted testing and QA approach | `docs/TDD.md` (red/green commit pairs, coverage, evals, how AI output was validated) |
| Prior-work disclosure | README line from Step 1 |

**Clean history:**
- [ ] `gitleaks git --redact -v` on the full history: no findings
- [ ] No `.env`, real PHI or plain-text injection payloads anywhere in history

**The ZIP holds the complete project and its full git history.** Build it from a fresh clone, so ignored
files (`.env`, `node_modules`, `ai-audit/`) can't slip in:

```bash
cd .. && rm -rf claimsense-submit
git clone claimsense claimsense-submit
cd claimsense-submit && git log --oneline | wc -l && cd ..   # history is there
zip -rq claimsense-submission.zip claimsense-submit
unzip -l claimsense-submission.zip | grep -E '/\.env$|/\.env\.local$|node_modules|ai-audit' \
  && echo "STOP: remove these" || echo "ZIP clean"
```

**Demo video, 5 minutes or less:**

| Time | Content |
|---|---|
| 0:00–0:30 | The problem: surprise deductions at discharge |
| 0:30–2:30 | Sample Case B: setup → facts with quotes → estimate → room simulator → chat what-if + the refusal → history → delete |
| 2:30–4:15 | How AI built it: `CLAUDE.md` and skills; `/tdd` with a red → green pair; a hook blocking a force-push live; the code-reviewer agent catching something; two `AI_LOG.md` entries |
| 4:15–5:00 | Architecture ("AI reads, code decides"), test counts and coverage, limitations |

**Final steps:**
- [ ] Submit through the designated process, with deployment access details if needed
- [ ] **Stop committing**
