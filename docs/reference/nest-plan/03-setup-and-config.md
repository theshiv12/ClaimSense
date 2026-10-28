# Setup steps and config files

## A two-hour day-zero spike proves the stack before any feature

Do the spike on the evening of 22 Oct. It ends when four things work: `pnpm build`, `pnpm test` (one DI unit test plus one supertest e2e test against an in-memory MongoDB), `node apps/api/dist/main.js`, and `docker build`. If the Vitest-plus-Nest-DI test cannot be made green in 30 minutes, re-scaffold the API with `--type cjs` and Jest. The commands:

```bash
nvm install 24 && nvm use 24                      # 24.22.1
npm install -g pnpm@12.14.0
mkdir claimsense && cd claimsense && git init -b main
cp -r ../claimsense-ai-kit/. .                     # AI kit first, then commit it
echo 24 > .nvmrc
mkdir -p apps/web packages/shared/src packages/rules/src config/plans/drafts \
         fixtures/cases fixtures/docs evals/conversations evals/extraction docs/decisions
## write package.json, pnpm-workspace.yaml, tsconfig.base.json, eslint.config.mjs (below)

pnpm add -Dw typescript@~6.0.2 @types/node@^24 eslint@^10.13.0 @eslint/js@^10.0.1 \
  typescript-eslint@^8.72.0 eslint-config-prettier@^10.1.8 prettier@^3.9.10 \
  vitest@^5.0.5 @vitest/coverage-v8@^5.0.5 tsx@^4.23.15

## API: official scaffold (ESM is the default type), then strip tooling the root owns.
## Flag names were not verified against `nest new --help`; check them first.
pnpm dlx @nestjs/cli@12.0.10 new api --directory apps/api --package-manager pnpm --skip-git --skip-install
rm -f apps/api/pnpm-lock.yaml apps/api/oxlint.json   # Nest 12 scaffolds oxlint; we lint from the root
## edit apps/api/package.json: "name": "@claimsense/api", "type": "module", scripts below

pnpm --filter @claimsense/shared add zod@^4.6.7
pnpm --filter @claimsense/rules add @claimsense/shared@workspace:* date-fns
pnpm --filter @claimsense/rules add -D @claimsense/config@workspace:* @claimsense/fixtures@workspace:* \
  fast-check @fast-check/vitest
pnpm --filter @claimsense/api add @claimsense/shared@workspace:* @claimsense/rules@workspace:* \
  @claimsense/config@workspace:* @claimsense/fixtures@workspace:* \
  @nestjs/config@^12.0.1 @nestjs/mongoose@^12.0.0 mongoose@^9.11.3 @nestjs/throttler@^6.7.1 \
  @nestjs/terminus@^12.1.0 nestjs-pino@^5.3.1 pino@^10 pino-http@^11 helmet@^8.3.0 jose@^6.2.13 \
  zod@^4.6.7 @azure/storage-blob@^12.34.0 unpdf@^1.9.1 sharp@^0.35.5 approx-string-match@^2.0.1
pnpm --filter @claimsense/api add -D unplugin-swc @swc/core@^1.16.18 supertest @types/supertest \
  mongodb-memory-server @types/multer pino-pretty
pnpm approve-builds          # approve what it lists; see allowBuilds below
## Day 3 only (needs the SDK to be one day old):
##   pnpm --filter @claimsense/api add @anthropic-ai/sdk@^1.1.0

pnpm build && pnpm lint && pnpm typecheck && pnpm test
docker build -f apps/api/Dockerfile -t claimsense-api .
```

**`pnpm-workspace.yaml`.** On pnpm 11 and later, this file holds the settings that used to live in `.npmrc` ([pnpm 11 release](https://pnpm.io/ko/blog/releases/11.0)). The `allowBuilds` list is a best guess at which packages have build scripts; add whatever `pnpm install` reports. Setting `mongodb-memory-server` to `false` is meant to skip its install-time binary download so the binary is fetched on the first test run instead. Whether `false` acts as "ignore" is unverified.

```yaml
packages:
  - apps/*
  - packages/*
  - config
  - fixtures

allowBuilds:
  '@swc/core': true
  sharp: true
  esbuild: true
  mongodb-memory-server: false

overrides:
  typescript: ~6.0.2      # TS 7 breaks typescript-eslint (<6.1) and @nestjs/cli (~6.0.2)

## minimumReleaseAge defaults to 1440 minutes. Keep it: it is a supply-chain guard.
```

**Root `package.json`.** `packageManager` lets CI and the `pnpm/action-setup` step pick the same pnpm ([pnpm/action-setup](https://github.com/pnpm/action-setup)). `pnpm -r` runs packages in dependency order, so `build` compiles `shared` before `rules` before `api`.

```json
{
  "name": "claimsense",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@12.14.0",
  "engines": { "node": ">=24.15 <25" },
  "scripts": {
    "dev": "pnpm --filter \"@claimsense/api...\" --parallel run dev",
    "build": "pnpm -r run build",
    "typecheck": "pnpm -r run typecheck",
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "pnpm -r run test",
    "test:cov": "pnpm -r run test:cov",
    "cases": "pnpm --filter @claimsense/rules run cases",
    "eval:extraction": "pnpm --filter @claimsense/api run eval:extraction",
    "eval:conversations": "pnpm --filter @claimsense/api run eval:conversations"
  }
}
```

**`tsconfig.base.json`.** This follows the Nest 12 scaffold (`nodenext`, `ES2023`) ([@nestjs/schematics 12 notes](https://newreleases.io/project/npm/@nestjs/schematics/release/12.0.0)). It sets `types` explicitly because TypeScript 6 defaults it to `[]`. Two strict flags, `exactOptionalPropertyTypes` and `noPropertyAccessFromIndexSignature`, are left out on purpose: they cause noisy errors with Zod-inferred types and `process.env` that cost time in a 3-day build.

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "types": ["node"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

**Two tsconfigs per package.** A Nest app compiles with tsc and runs plain Node, so it cannot consume packages that export raw `.ts` source. Internal packages must be compiled, with `exports` pointing at `dist` ([Turborepo internal packages](https://turborepo.dev/docs/core-concepts/internal-packages)). That creates a build-before-typecheck ordering problem. Avoid it with two configs per package:

- **`tsconfig.json`** is used by the editor, typecheck and lint. It is `noEmit` and maps sibling packages to their **source** through `paths`. Without `baseUrl`, `paths` resolve relative to the tsconfig file, so this avoids the deprecated `baseUrl`.
- **`tsconfig.build.json`** has no `paths`. It resolves siblings through `node_modules` to their compiled `dist` typings.

The result is instant cross-package type feedback with no prior build, and clean emitted output. This split is my own inference, not a sourced pattern. If `paths` misbehaves, fall back to "`pnpm build` before `pnpm typecheck`".

```jsonc
// packages/shared/package.json  (rules is the same shape, plus the "cases" script)
{
  "name": "@claimsense/shared", "version": "0.0.0", "private": true, "type": "module",
  "exports": { ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" } },
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "dev": "tsc -p tsconfig.build.json --watch",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:cov": "vitest run --coverage"
  },
  "dependencies": { "zod": "^4.6.7" }
}
// packages/rules/package.json adds:  "cases": "vitest run src/__tests__/cases.test.ts"

// packages/rules/tsconfig.json
{ "extends": "../../tsconfig.base.json",
  "compilerOptions": { "noEmit": true, "paths": { "@claimsense/shared": ["../shared/src/index.ts"] } },
  "include": ["src", "test", "*.config.ts"] }

// packages/rules/tsconfig.build.json
{ "extends": "../../tsconfig.base.json",
  "compilerOptions": { "rootDir": "src", "outDir": "dist", "declaration": true },
  "include": ["src"], "exclude": ["src/**/__tests__/**", "src/**/*.test.ts"] }
```

**`config/` and `fixtures/` are JSON plus a tiny hand-written ESM loader**, so they need no build step:

```js
// config/index.js   (+ index.d.ts declaring the two functions)
import { readdirSync, readFileSync } from 'node:fs';
const plans = new URL('./plans/', import.meta.url);
export const readPlanFiles = () =>
  readdirSync(plans).filter((f) => f.endsWith('.json'))   // drafts/ is a folder, so it is skipped
    .map((file) => ({ file, data: JSON.parse(readFileSync(new URL(file, plans), 'utf8')) }));
export const readRemedies = () =>
  JSON.parse(readFileSync(new URL('./remedies.json', import.meta.url), 'utf8'));
// config/package.json: "name": "@claimsense/config", "type": "module",
//   "exports": { ".": { "types": "./index.d.ts", "default": "./index.js" } },
//   "files": ["index.js", "index.d.ts", "plans/*.json", "remedies.json"]
```

The loaders return raw JSON. Every consumer parses it with the shared Zod schema: the API's `PlanRegistry` at boot, so a bad plan file stops startup, and the rules tests through a factory helper.

**Vitest configs.** The rules package carries the strictest coverage gate. Aliases point workspace imports at source, so the TDD loop never waits on a build. Vitest does not read TypeScript `paths` itself ([NestJS SWC recipe](https://docs.nestjs.com/recipes/swc)).

```ts
// packages/rules/vitest.config.ts
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
const src = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: { alias: { '@claimsense/shared': src('../shared/src/index.ts') } },
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/__tests__/**', 'src/index.ts'],
      thresholds: { lines: 100, functions: 100, statements: 100, branches: 95 },
    },
  },
});
```

The API uses **one** Vitest config for unit and integration tests together. That gives one command, one merged coverage report and one threshold. A global setup starts a single `mongod`, and each test file gets its own database name, so files can run in parallel without touching each other. The SWC plugin settings come from Nest's recipe ([NestJS SWC recipe](https://docs.nestjs.com/recipes/swc)). mongodb-memory-server needs no Docker, defaults to MongoDB 8.2.6 binaries, and uses about 7 MB per instance ([mongodb-memory-server](https://github.com/typegoose/mongodb-memory-server)).

```ts
// apps/api/vitest.config.ts
import swc from 'unplugin-swc';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
const src = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],        // emits decorator metadata for Nest DI
  resolve: {
    alias: {
      '@claimsense/shared': src('../../packages/shared/src/index.ts'),
      '@claimsense/rules': src('../../packages/rules/src/index.ts'),
    },
  },
  test: {
    include: ['src/**/*.spec.ts', 'src/**/*.e2e-spec.ts'],
    globalSetup: ['test/setup/mongo.global-setup.ts'],
    setupFiles: ['test/setup/env.ts'],
    testTimeout: 20_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/main.ts', 'src/**/*.module.ts', 'src/infra/llm/prompts/**'],
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 75 },
    },
  },
});

// test/setup/mongo.global-setup.ts
import { MongoMemoryServer } from 'mongodb-memory-server';
let mongod: MongoMemoryServer | undefined;
export async function setup() { mongod = await MongoMemoryServer.create(); process.env.MONGO_URI = mongod.getUri(); }
export async function teardown() { await mongod?.stop(); }

// test/setup/env.ts  (runs in each test file's worker before its imports)
import { randomUUID } from 'node:crypto';
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.MONGO_URI ?? '';
process.env.MONGODB_DB = `t_${randomUUID().slice(0, 8)}`;          // one database per test file
process.env.API_JWT_SECRET = 'test-only-secret-that-is-at-least-32-chars';
process.env.ANTHROPIC_API_KEY = 'test';
process.env.AZURE_STORAGE_CONNECTION_STRING = 'UseDevelopmentStorage=true';
```

Whether an env var set in `globalSetup` reaches the workers is unverified. If `MONGO_URI` arrives empty, switch to Vitest's `provide`/`inject`.

`createTestApp()` builds the real `AppModule` and swaps three dependencies:

- `LlmService` becomes a `FakeLlmService`;
- `StorageService` becomes an `InMemoryStorageService`;
- `Clock` becomes a `FixedClock`.

It then calls the same `configureApp(app)` as `main.ts`, so tests run the real filters and middleware. Tests authenticate by minting real tokens with `jose` (`signTestToken('user-a')`), so the real `AuthGuard` runs in every e2e test. The `apps/api` scripts are:

| Script | Command |
|---|---|
| `dev` | `nest start --watch` |
| `build` | `nest build` (nest-cli.json points `tsConfigPath` at `tsconfig.build.json`) |
| `start` | `node dist/main.js` |
| `typecheck` | `tsc --noEmit` |
| `test` | `vitest run` |
| `test:cov` | `vitest run --coverage` |
| `eval:extraction` | `vitest run --config vitest.config.eval.ts extraction` |
| `eval:conversations` | `vitest run --config vitest.config.eval.ts conversations` |

The API's `tsconfig.json` is the base config plus `noEmit`, `experimentalDecorators`, `emitDecoratorMetadata` and `paths` to both packages' sources. `tsconfig.build.json` adds `rootDir: src` and `outDir: dist`.

**`eslint.config.mjs`.** Use one root flat config, and delete the oxlint config that Nest 12 scaffolds ([NestJS v12 release](https://newreleases.io/project/github/nestjs/nest/release/v12.0.0)). The two `no-restricted-imports` blocks turn the architecture into lint errors, which is cheap and visible evidence for the engineering score. The `defineConfig` helper and `extends` inside it were not re-verified against ESLint 10's docs.

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';

export default defineConfig(
  { ignores: ['**/dist/**', '**/coverage/**', 'apps/web/**', 'config/**', 'fixtures/**'] },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  { languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } } },
  { files: ['**/*.{js,mjs}'], extends: [tseslint.configs.disableTypeChecked] },
  {
    files: ['packages/rules/src/**/*.ts'],                    // pure engine: no I/O, no framework
    rules: { 'no-restricted-imports': ['error', {
      patterns: ['node:*', 'fs', 'path', '@nestjs/*', 'mongoose', '@anthropic-ai/*'] }] },
  },
  {
    files: ['apps/api/src/**/*.ts'], ignores: ['apps/api/src/infra/**'],   // vendor SDKs only in infra/
    rules: { 'no-restricted-imports': ['error', {
      paths: ['@anthropic-ai/sdk', '@azure/storage-blob', 'unpdf', 'sharp'] }] },
  },
  prettier,
);
```

**`apps/api/Dockerfile`** (the build context is the repo root). This follows pnpm's own recipe: install from the frozen lockfile, build the API and its workspace dependencies, then `pnpm deploy --prod` into a self-contained folder that is copied into a slim runtime image ([pnpm Docker](https://pnpm.io/docker); [pnpm deploy](https://pnpm.io/cli/deploy)). Copy `pnpm-workspace.yaml` before `pnpm install`, or frozen installs can break. Every workspace package needs a `files` field so `deploy` copies the right things. The final `.dockerignore` excludes `**/node_modules`, `**/dist`, `**/coverage`, `.git`, `.env*`, `apps/web` and `evals`.

```dockerfile
## syntax=docker/dockerfile:1
FROM node:24-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true
RUN npm install -g pnpm@12.14.0
WORKDIR /repo

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
COPY packages/rules/package.json packages/rules/
COPY config/package.json config/
COPY fixtures/package.json fixtures/
RUN pnpm install --frozen-lockfile --filter "@claimsense/api..."
COPY tsconfig.base.json ./
COPY packages packages
COPY config config
COPY fixtures fixtures
COPY apps/api apps/api
RUN pnpm --filter "@claimsense/api..." run build
RUN pnpm --filter @claimsense/api --prod deploy /out

FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 4000
CMD ["node", "dist/main.js"]
```

**`.github/workflows/ci.yml`.** This keeps the kit's secret scan and sample-case step, and fixes the parts that no longer match the stack:

- `pnpm/action-setup@v6`, which reads `packageManager` ([pnpm/action-setup](https://github.com/pnpm/action-setup));
- Node taken from `.nvmrc`;
- an explicit `test:cov` script;
- a cache for the MongoDB binary;
- a coverage artifact;
- a Docker build smoke test.

Block-style YAML avoids the brace-parsing trap with `${{ }}` inside flow mappings. The cache path is mongodb-memory-server's usual download folder, which was not verified. Check `actions/setup-node` for a newer major.

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
jobs:
  checks:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0               # full history so the secret scan sees every commit
      - name: Scan for secrets
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - uses: pnpm/action-setup@v6     # version from "packageManager"
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - uses: actions/cache@v4
        with:
          path: ~/.cache/mongodb-binaries
          key: mongoms-${{ runner.os }}-8.2.6
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm format:check
      - run: pnpm typecheck
      - run: pnpm test:cov             # per-package Vitest thresholds fail the job
      - name: Sample cases match expected verdicts
        run: pnpm cases
      - run: pnpm build
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage
          path: |
            packages/*/coverage
            apps/api/coverage
      - name: Docker build (smoke)
        run: docker build -f apps/api/Dockerfile -t claimsense-api:ci .
```

The fetched Vitest docs do not say outright that a missed threshold exits non-zero. Prove it once by lowering a rules test's coverage on a scratch branch.
