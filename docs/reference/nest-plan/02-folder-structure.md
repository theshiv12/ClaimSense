# Folder structure

## Six workspace packages and three API layers keep Claude at the edge

Dependencies point one way. `shared` (Zod schemas and inferred types) depends on nothing but Zod. `rules` depends on `shared` and has no I/O. `api` depends on both, plus two JSON-only packages, `config` (plans and remedies) and `fixtures` (sample cases), loaded and validated at boot. The future web app will import `shared` so browser forms validate with the same schemas. Making `config` and `fixtures` workspace packages, rather than plain folders, means `pnpm deploy` ships them into the Docker image without extra `COPY` lines ([pnpm deploy](https://pnpm.io/cli/deploy)). The API needs both at runtime: plans for every check, cases for `POST /sample/:caseId`.

```
claimsense/
├─ .github/workflows/      ci.yml  nightly-evals.yml  claude.yml  claude-review.yml
├─ .claude/                settings.json  hooks/  skills/  agents/          (AI kit)
├─ CLAUDE.md  AI_LOG.md  README.md  .env.example  .gitignore  .dockerignore
├─ package.json  pnpm-workspace.yaml  pnpm-lock.yaml  .nvmrc
├─ tsconfig.base.json  eslint.config.mjs  .prettierrc.json  .prettierignore
├─ apps/
│  ├─ api/                 @claimsense/api      NestJS 12, ESM (detail below)
│  └─ web/                 @claimsense/web      placeholder: package.json + CLAUDE.md only, until day 3+
├─ packages/
│  ├─ shared/              @claimsense/shared   Zod schemas, types, money/date primitives, ErrorCode
│  │  └─ src/  primitives.ts  fact.schema.ts  claim-facts.schema.ts  plan-config.schema.ts
│  │           rule-result.schema.ts  remedy.schema.ts  errors.ts  api/*.ts  index.ts
│  └─ rules/               @claimsense/rules    pure engine: no I/O, no clock, no LLM
│     ├─ src/  index.ts  engine.ts  verdict.ts  to-claim-facts.ts  money.ts  dates.ts
│     │        rules/r1-policy-active.ts … r8-sum-insured-cap.ts
│     │        rules/__tests__/r1-policy-active.test.ts …   __tests__/engine.test.ts
│     │        __tests__/engine.props.test.ts  __tests__/cases.test.ts
│     └─ test/factories.ts
├─ config/                 @claimsense/config   JSON + a 10-line loader (index.js, index.d.ts)
│  ├─ plans/<plan-id>.json   plans/drafts/        (drafts are never loaded)
│  └─ remedies.json
├─ fixtures/               @claimsense/fixtures
│  ├─ cases/{A,B,B2,C,D}/case.json + expected.json   (input facts, expected estimate)
│  └─ docs/                synthetic PDFs/photos for evals (no real PHI, ever)
├─ evals/
│  ├─ conversations/CE-*.yaml        (CE-1..CE-6)
│  └─ extraction/golden/*.json       (synthetic document → ground-truth facts)
└─ docs/                   prd.md  architecture.md  api.md  rules-spec.md  test-cases.md
                           TDD.md  ai-usage.md  decisions/ADR-00x-*.md
```

Inside `apps/api`, the three layers have strict jobs. **`common/`** holds cross-cutting code with no business rules: the auth guard, error envelope, validation pipes, the owner-scoped repository base class, the clock and the logger config. **`infra/`** is the only place that may import a vendor SDK: `@anthropic-ai/sdk`, `@azure/storage-blob`, `unpdf` and `sharp`. Each sits behind an abstract class that Nest uses as its DI token. **`modules/`** holds one folder per feature, following the kit's pattern. Lint enforces the boundaries (see the ESLint config): `rules` cannot import `node:*`, `fs`, `@nestjs/*` or `mongoose`, and nothing under `api/src` except `infra/` can import a vendor SDK.

```
apps/api/
├─ package.json  nest-cli.json  tsconfig.json  tsconfig.build.json
├─ vitest.config.ts  vitest.config.eval.ts  Dockerfile
├─ src/
│  ├─ main.ts                    bootstrap only
│  ├─ configure-app.ts           helmet, trust proxy, global filter, shutdown hooks (shared with tests)
│  ├─ app.module.ts              ConfigModule, MongooseModule, LoggerModule, Throttler, APP_GUARDs
│  ├─ common/
│  │  ├─ auth/       auth.guard.ts  public.decorator.ts  current-user.decorator.ts  user-throttler.guard.ts
│  │  ├─ errors/     app.exception.ts  app-exception.filter.ts
│  │  ├─ pipes/      zod-validation.pipe.ts  object-id.pipe.ts
│  │  ├─ db/         scoped.repository.ts  require-user-scope.plugin.ts
│  │  ├─ clock/      clock.ts            (abstract Clock; SystemClock)
│  │  ├─ logging/    logger.config.ts    (pino redact list)
│  │  └─ config/     env.schema.ts
│  ├─ infra/
│  │  ├─ llm/        llm.service.ts (abstract)  anthropic-llm.service.ts  parse-extraction.ts
│  │  │              map-sdk-error.ts  prompts/{extract,screen,classify,reply}.v1.ts
│  │  ├─ storage/    storage.service.ts (abstract)  azure-blob-storage.service.ts
│  │  ├─ pdf/        pdf-text.service.ts (pages, password, text layer)  quote-verifier.ts  normalize-text.ts
│  │  ├─ images/     image-preprocessor.ts (sharp: orient, resize, min size)
│  │  ├─ catalog/    plan-registry.ts  remedy-catalog.ts  sample-cases.ts   (Zod-validated at boot)
│  │  └─ retention/  retention.sweeper.ts (deletes expired blobs)
│  └─ modules/
│     ├─ users/       users.repository.ts  user.schema.ts
│     ├─ plans/       plans.controller.ts  plans.service.ts
│     ├─ claims/      claims.{module,controller,service,repository,schema}.ts  __tests__/
│     ├─ documents/   … + file-validation.pipe.ts
│     ├─ extraction/  extraction.controller.ts (POST extract)  facts.controller.ts (PATCH)
│     │               extraction.service.ts  facts.repository.ts  fact.schema.ts
│     ├─ checks/      checks.controller.ts (check, simulate, remedies)  checks.service.ts
│     │               estimates.repository.ts  estimate.schema.ts
│     ├─ chat/        chat.controller.ts  chat.service.ts  reply-guard.ts  messages.repository.ts
│     ├─ sample/      sample.controller.ts  sample.service.ts
│     └─ health/      health.controller.ts
├─ test/
│  ├─ setup/     mongo.global-setup.ts  env.ts
│  ├─ utils/     create-test-app.ts  sign-test-token.ts  files.ts (pdf/png/jpeg/zip buffers)
│  ├─ fakes/     fake-llm.service.ts  in-memory-storage.service.ts  fixed-clock.ts
│  └─ fixtures/  llm/*.json (recorded API responses, synthetic docs only)   docs/*.pdf
└─ evals/        conversations.eval.ts  extraction.eval.ts   (live API; nightly, never in CI)
```
