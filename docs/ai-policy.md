# AI policy

**Owner:** the repo owner (solo build). Backup: none (solo hackathon entry). Reviewed daily until 30 Oct 2026.

| Topic | Policy |
|---|---|
| Tools | Claude Code (CLI) for development; Claude GitHub App for PR review (`@claude`, review workflow). Gemini free tier is the product's runtime model. |
| Accounts | The developer's **own** Claude and Google accounts only. Never an employer, client or colleague account; never a work database. |
| Data | Synthetic documents and test data only. Real `.env` files are denied to agents (settings deny rules + `guard-writes` / `guard-bash` hooks). No real PHI in fixtures, evals or logs. |
| MCP / plugins | None committed. Adding one needs a PR that adds an inventory row here (purpose, publisher, pinned version, scopes). |
| Dangerous modes | No `bypassPermissions` or `--dangerously-skip-permissions`, anywhere. |
| Approval points (always a human) | `git push`, merging PRs, adding/removing dependencies, editing `.github/`, `.claude/`, `CLAUDE.md` or `config/plans/`, deploys, anything that deletes data, live Gemini calls outside the app. |
| Review | Every AI change goes through a PR the human reads line by line; the `code-reviewer` agent and Claude review supplement, never replace, that. |
| Attribution | AI-assisted commits end with `Co-Authored-By: Claude <noreply@anthropic.com>`. |
| Failures | Every AI mistake caught goes in `AI_LOG.md` with what changed (rule, hook, test). |
| Licence / IP | No third-party code pasted without checking its licence; generated code is reviewed and owned by the author. |
| Transcripts | Claude and Gemini retention follows each account's data settings; free-tier Gemini content may be used by Google (see `docs/compliance.md`). |
