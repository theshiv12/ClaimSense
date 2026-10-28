# Stack decisions and versions

## Build ClaimSense test-first from rules outward

Build ClaimSense's backend as a plain **pnpm 12 workspace with no Turborepo, on Node 24**. The API is **NestJS 12 in ESM**, **Vitest 5 is the only test runner**, and **TypeScript is pinned to `~6.0.2`**. These are not matters of taste. In October 2026 NestJS ships its core packages as ESM and scaffolds Vitest by default. The npm `latest` TypeScript is 7.0, which breaks typescript-eslint and the Nest CLI. The repo has six workspace packages: `apps/api`, an `apps/web` placeholder, shared Zod schemas, a pure rules engine, and two JSON-only packages for plan config and sample cases. Inside the API, code splits into `common` (auth, errors, owner scoping), `infra` (Claude, Azure Blob, PDF handling) and one module per feature. Claude Sonnet 5.5 extracts facts through structured outputs on the new `@anthropic-ai/sdk` 1.1.0, which guarantees the JSON matches the schema. Native citations cannot be combined with that mode, so code checks every `sourceQuote` against the PDF text layer. The deterministic engine alone computes the verdict and the rupee amounts, in integer paise. The build runs inside-out over 23–25 Oct: schemas and the eight rules first (100% line coverage target), then the owner-scoped API and uploads, then extraction, check and chat. Every issue starts with red tests named by test-case ID. Two late changes will trip anyone working from older tutorials. SDK 1.0, released 21 Oct, moved to API version `2026-10-21`, which returns a 400 for any `temperature`. pnpm's default one-day `minimumReleaseAge` blocks installing that SDK until the morning of 23 Oct IST. The existing AI kit needs about twenty surgical, mostly one-line edits to match: Jest becomes Vitest, Node 22 becomes 24, `action-setup` v4 becomes v6, plus a new Fact shape and a domain-level `LlmService`.

## October 2026's toolchain makes the three big choices for you

**Recommendation: ESM + Vitest, not CommonJS + Jest.** NestJS 12.0.0 (27 Aug 2026; 12.2.0 is current) states that "all core Nest packages now ship as ESM". `nest new` defaults to ESM, and "Vitest is the default test runner for ESM projects; CommonJS projects continue with Jest" ([NestJS v12 release](https://newreleases.io/project/github/nestjs/nest/release/v12.0.0)). The official testing docs now say newly generated projects use Vitest, and their examples use `vi.fn()` ([NestJS docs: Testing](https://docs.nestjs.com/fundamentals/testing)). Choosing CommonJS + Jest is still supported, but it moves the biggest unknown to day one. Nobody has confirmed how Jest 30's module runtime loads the now-ESM `@nestjs/*` packages and ESM workspace packages inside a CommonJS app. ts-jest also caps TypeScript below 7 ([ts-jest on npm](https://registry.npmjs.org/ts-jest/latest)). Vitest gives one runner across `api`, `shared` and `rules`, with per-package coverage thresholds ([Vitest coverage config](https://vitest.dev/config/coverage)) and a fast-check integration (`@fast-check/vitest`) for property tests. ESM has four real costs:

- relative imports need `.js` extensions under `nodenext`;
- the API's tests need `unplugin-swc`, because Nest's DI depends on decorator metadata;
- supertest must use a default import (`import request from 'supertest'`);
- `__dirname` becomes `import.meta.dirname`.

All four are documented in the NestJS SWC/Vitest recipe ([NestJS SWC recipe](https://docs.nestjs.com/recipes/swc)). If you know Jest far better than Vitest, that is the one good argument for CommonJS. The day-zero spike below is the escape hatch: if Vitest plus Nest DI cannot be made to work within 30 minutes, scaffold with `--type cjs` and use Jest 30 with `@swc/jest`.

**Pin `typescript@~6.0.2`, at the root and as a pnpm override.** TypeScript 7.0.2 is npm `latest` (published 8 Jul 2026) ([npm dist-tags](https://registry.npmjs.org/-/package/typescript/dist-tags)). It is the Go-native compiler and "ships without a stable programmatic API", so tools such as typescript-eslint cannot use it yet ([InfoQ](https://infoq.com/news/2026/08/typescript-7-released/)). typescript-eslint 8.72.0 declares `typescript >=4.8.4 <6.1.0` ([npm](https://registry.npmjs.org/typescript-eslint/latest)), and `@nestjs/cli` 12.0.10 has a hard dependency on `typescript ~6.0.2` ([npm](https://registry.npmjs.org/@nestjs/cli/latest)). A bare `pnpm add -D typescript` would install 7.0.2 and break linting. TypeScript 6 also changed defaults that will surprise you on day one: `strict` is on, `types` defaults to `[]` (so `process` and Node globals vanish unless you list `"node"`), `rootDir` defaults to `.`, and `baseUrl` and `moduleResolution: node10` are deprecated ([Visual Studio Magazine](https://visualstudiomagazine.com/articles/2026/03/23/typescript-6-0-ships-as-final-javascript-based-release-clears-path-for-go-native-7-0.aspx?p=1)).

**Do not add Turborepo.** Turborepo earns its keep by caching build outputs ([Turborepo internal packages](https://turborepo.dev/docs/core-concepts/internal-packages)). With two apps, four small packages and one developer there is little to cache. pnpm already runs scripts across the workspace (`pnpm -r run build`) and deploys a single app with `pnpm deploy`, with no orchestrator ([pnpm Docker docs](https://pnpm.io/docker)). Turbo 2.11.10 can be added later if CI time hurts.

**Use pnpm 12.14.0 and Node 24.** pnpm 12 is a Rust rewrite of pnpm, released 26 Aug ([pnpm 12 release](https://pnpm.io/blog/releases/12.0)). Since 12.2.0, `pnpm deploy` no longer needs `injectWorkspacePackages` ([pnpm deploy](https://pnpm.io/cli/deploy)), which simplifies the Dockerfile. If pnpm 12 misbehaves, 11.28.6 (`latest-11`) is the fallback ([npm dist-tags](https://registry.npmjs.org/-/package/pnpm/dist-tags)). Since pnpm 11, settings live in `pnpm-workspace.yaml` rather than `.npmrc`. pnpm 11 also turned on two defaults: `minimumReleaseAge: 1440` (a package must be a day old before it resolves) and `strictDepBuilds: true` (install fails on unapproved build scripts) ([pnpm 11 release](https://pnpm.io/ko/blog/releases/11.0)). As of 22 Oct no Node line is in active LTS. Node 24.22.1 is in maintenance with security fixes until April 2028, and Node 26 is still "upcoming LTS" ([endoflife.date](https://endoflife.date/nodejs)). Node 24 clears every dependency floor: `@nestjs/schematics` needs `^24.15.0`, nestjs-pino needs `>=22.12`, and pdfjs-dist needs `>=22.13`. The kit's CI uses Node 22, which works only from 22.22.3 upward.

**Smaller choices, made now so they are not re-litigated later:**

| Concern | Choice | Why |
|---|---|---|
| HTTP adapter | Express | Multer uploads with `ParseFilePipe` are the best-documented path. Fastify multipart only arrived in Nest 12.1 ([NestJS file upload](https://docs.nestjs.com/techniques/file-upload)). |
| Request validation | A 15-line `ZodValidationPipe` of your own | nestjs-zod 5.5.0 declares peers only up to Nest 11 ([npm](https://registry.npmjs.org/nestjs-zod)). Nest 12's built-in `@Body({ schema })` exists ([NestJS validation](https://docs.nestjs.com/techniques/validation)), but its pipe's import path is unverified. Switch later if you want it. |
| Env validation | `@nestjs/config` 12 | Accepts a Zod schema as `validationSchema` through Standard Schema ([NestJS configuration](https://docs.nestjs.com/techniques/configuration)). |
| Web-to-API auth | The Next.js server signs a 5-minute HS256 token with `jose`; Nest verifies it | Auth.js says its own JWTs are meant for the app that issued them ([Auth.js JWT](https://authjs.dev/reference/core/jwt)). next-auth v5 is still `5.0.0-beta.32` ([npm](https://registry.npmjs.org/next-auth)). |
| Logging | nestjs-pino 5.3.1 with `redact` | Requires pino 10 and pino-http 11 ([nestjs-pino](https://github.com/iamolegga/nestjs-pino)). |
| Swagger | Skip it for the hackathon | Adds little to a solo demo. |

**Versions, read from the npm registry on 22 Oct 2026:**

| Package | Pin | Note | Source |
|---|---|---|---|
| Node.js | 24.22.1 (`.nvmrc`: `24`) | Maintenance LTS; satisfies every engine floor | [endoflife.date](https://endoflife.date/nodejs) |
| pnpm | `pnpm@12.14.0` in `packageManager` | 11.28.6 as fallback | [npm](https://registry.npmjs.org/-/package/pnpm/dist-tags) |
| typescript | `~6.0.2` | **Not** 7.0.2 (`latest`) | [npm](https://registry.npmjs.org/-/package/typescript/dist-tags) |
| @nestjs/core, common, platform-express, testing | `^12.2.0` | ESM packages | [npm](https://registry.npmjs.org/@nestjs%2Fcore) |
| @nestjs/cli / schematics | `12.0.10` | Depends on TS `~6.0.2` | [npm](https://registry.npmjs.org/@nestjs/cli/latest) |
| @nestjs/config · mongoose adapter · terminus · throttler | `^12.0.1` · `^12.0.0` · `^12.1.0` · `^6.7.1` | | [npm](https://registry.npmjs.org/@nestjs%2Fcore) |
| mongoose | `^9.11.3` | CommonJS; imports fine from ESM | [npm](https://registry.npmjs.org/mongoose) |
| zod | `^4.6.7` | | [npm](https://registry.npmjs.org/zod/latest) |
| nestjs-pino · helmet · jose | `^5.3.1` · `^8.3.0` · `^6.2.13` | | [npm](https://registry.npmjs.org/nestjs-pino) |
| vitest · @vitest/coverage-v8 | `^5.0.5` | Node `^22.12 \|\| ^24 \|\| >=26` | [npm](https://registry.npmjs.org/vitest/latest) |
| @swc/core | `^1.16.18` | Used by `unplugin-swc` | [npm](https://registry.npmjs.org/-/package/@swc/core/dist-tags) |
| eslint · @eslint/js · typescript-eslint | `^10.13.0` · `^10.0.1` · `^8.72.0` | ESLint 9 reached end of life on 6 Aug 2026 | [eslint.org](https://eslint.org/blog/2026/02/eslint-v10.0.0-released/) |
| prettier · eslint-config-prettier | `^3.9.10` · `^10.1.8` | | [npm](https://registry.npmjs.org/-/package/prettier/dist-tags) |
| @anthropic-ai/sdk | `^1.1.0` | Sends `anthropic-version: 2026-10-21` | [npm](https://registry.npmjs.org/@anthropic-ai/sdk) |
| @azure/storage-blob | `^12.34.0` | Node `>=22` | [npm](https://registry.npmjs.org/@azure%2Fstorage-blob) |
| unpdf | `^1.9.1` | Bundles PDF.js 6.4.299 | [npm](https://registry.npmjs.org/unpdf) |
| sharp · approx-string-match | `^0.35.5` · `^2.0.1` | | [npm](https://registry.npmjs.org/sharp) |
| tsx | `^4.23.15` | Small scripts only | [npm](https://registry.npmjs.org/-/package/tsx/dist-tags) |

Some packages are deliberately left out: Jest 30.5.2, ts-jest 29.4.15, turbo 2.11.10 and nestjs-zod 5.5.0. The current versions of `unplugin-swc`, `supertest`, `mongodb-memory-server`, `fast-check`, `@fast-check/vitest` and `date-fns` were not checked. Accept whatever `pnpm add` resolves and commit the lockfile.

Two traps are new this week:

1. **Do not send `temperature`.** On API version `2026-10-21`, sending `temperature`, `top_p` or `top_k` returns a 400 "even at the parameter's default value" ([Anthropic versioning](https://platform.claude.com/docs/en/api/versioning)). Any tutorial that sets `temperature: 0` breaks on SDK 1.x.
2. **Don't install the SDK on day zero.** SDK 1.0.0 and 1.1.0 were both published on 21 Oct (1.1.0 at 22:03 UTC) ([npm](https://registry.npmjs.org/@anthropic-ai/sdk)). pnpm's one-day minimum release age therefore refuses `^1.1.0` until about 03:30 IST on 23 Oct. Install it with the LLM issue on day three, not during the spike.
