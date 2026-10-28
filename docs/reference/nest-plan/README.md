# Backend blueprint

ClaimSense backend: NestJS 12 (ESM) + Vitest, TypeScript ~6.0.2, pnpm 12 workspaces, Node 24, MongoDB, Anthropic SDK 1.x. Built test-first, 23-25 Oct 2026.

Read only the file the current issue needs.

| File | Read it when |
|---|---|
| [01-stack-decisions.md](01-stack-decisions.md) | Before setup; any question about versions or why a tool was chosen |
| [02-folder-structure.md](02-folder-structure.md) | Creating files or modules; deciding where code goes |
| [03-setup-and-config.md](03-setup-and-config.md) | Day-0 spike: commands, pnpm-workspace, tsconfig, Vitest, ESLint, Docker, CI |
| [04-api.md](04-api.md) | Building or testing any route (auth, error envelope, 404 rule) |
| [05-schemas-and-data.md](05-schemas-and-data.md) | Zod schemas, plan config, MongoDB collections, indexes, retention |
| [06-llm-integration.md](06-llm-integration.md) | Extraction, quote verification, chat, prompt injection, model choice |
| [07-tdd-build-order.md](07-tdd-build-order.md) | Picking the next issue and its first red tests; coverage gates |
| [08-ai-kit-changes.md](08-ai-kit-changes.md) | Updating CLAUDE.md, skills, hooks and workflows to match |

Some sections refer to content "above" or "below"; those now live in the neighbouring file listed here.

## Summary

The striking finding is how much of this blueprint the calendar decided. A plan written in August would have chosen CommonJS, Jest, `typescript@latest`, `temperature: 0` and a citations-based grounding pass. Each of those now either breaks the build or returns a 400. For a hackathon that puts 35% of its marks on AI development practice, that churn is an asset, not just a hazard. The kit's `AI_LOG.md` and the ADRs can show judges, in the repo itself, an AI-assisted plan corrected against primary sources such as the npm registry, the NestJS release notes and Anthropic's versioning page. That evidence is stronger than any amount of generated code.

The second insight is that the safety seams and the test seams are the same seams. Code takes over every place where an LLM could do harm: the ownership filter, quote verification, the rules engine, the reply guard. Each of those is a pure or near-pure function that is trivially table-tested. That is why the plan can promise 100% line coverage on the rules package and deterministic prompt-injection tests without ever calling the model in CI. Three things remain unproven and should be measured on day 3 rather than assumed: how often real Sonnet 5.5 quotes verify at the untested 12% fuzzy threshold; whether `$defs` reuse counts against the structured-output limits; and how long a 20-page extraction takes on the chosen host. The golden-set eval answers the first. One live call answers the second. The deployed demo answers the third.
