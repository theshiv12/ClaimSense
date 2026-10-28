# TDD build order

## Three days, thirteen issues, every one opened by a red test

Each issue follows Kent Beck's Canon TDD loop: write the list of test scenarios, turn **exactly one** into a runnable test, make it pass, refactor, repeat ([Canon TDD](https://tidyfirst.substack.com/p/canon-tdd)). Beck lists one mistake that matters most for AI-written tests: "copying actual, computed values & pasting them into the expected values". So expected amounts are worked out by hand from the plan config, with the arithmetic in a comment.

The layers follow Fowler's pyramid. Push tests "as far down the test pyramid as you can". Most tests are fast unit tests of the pure engine. A thin layer of repository tests runs against a local database. A small set of HTTP tests covers the contract ([Fowler](https://martinfowler.com/articles/practical-test-pyramid.html)).

API issues use a double loop. The first red test is the route's e2e test pinned to `docs/api.md`, plus its 401, 404 and 400 rows. Then service-level red tests drive the code underneath. Commits use the kit's `test(<area>): TC-… (red)`, `feat(<area>): … (green)` and `refactor(<area>): …` messages. Push red and green together, and merge with a merge commit, not a squash. CI checks only the branch head, and a squash would erase the red/green evidence.

| # | When | Issue | Red first (written and failing before any code) | Green |
|---|---|---|---|---|
| 0 | 22 Oct evening | Spike and scaffold | `TC-SMOKE-01` Nest DI with decorator metadata resolves in `Test.createTestingModule`. `TC-SMOKE-02` `GET /health` returns 200 against mongodb-memory-server. `TC-SMOKE-03` the API imports a `shared` schema through the alias. | Workspace, configs, CI green, Docker image builds |
| 1 | 23 Oct AM | Shared schemas and config | `TC-SH-01..08`: `PaiseSchema` rejects 1.5 and −1; `rupeesToPaise('1,20,000.50')` gives 12000050 and `'12.345'` is rejected; not-found facts must carry the sentinels; `LlmExtractionSchema` uses at most 24 optional and 16 union parameters (walks `z.toJSONSchema`). `TC-CFG-01..03`: every `config/plans/*.json` parses; every rule value has a `ClauseRef` with a quote; `remedies.json` has unique IDs and at least one remedy per rule ID. | Schemas, the money helper, the two config loaders |
| 2 | 23 Oct AM | R1–R5 eligibility (use `rules-test-generator` per rule) | Table rows per rule with IDs: day 29, 30 and 31 of the initial wait; months 23, 24 and 25 with porting credit; PED 35, 36, 37 and the 48-month wording; moratorium 59, 60 and 61; accident exemption; missing fact gives `unknown`; same facts on plan 2 give a different result. | One file per rule, values only from config |
| 3 | 23 Oct PM | R6–R8 amounts | R6: rent within cap gives 0; over cap deducts proportionately on associated heads only, excluded heads untouched; ICU cap; a plan with no cap; a rounding row. R7: age at entry 60 vs 61. R8: exactly at the remaining sum insured, and 1 paise over. | Amount rules with the `runningPaise` signature |
| 4 | 23 Oct PM | Engine, verdict, cases, properties | `TC-ENG-*`: rule order and the payable waterfall; verdict mapping rows; `toClaimFacts` usability rows. `TC-CASE-A..D` against `expected.json`. `TC-PROP-01..05` with fast-check: 0 ≤ payable ≤ min(claimed, SI − used); payable never rises as co-pay rises; payable never rises as rent rises; same input gives a deep-equal output; `at_risk` implies an eligibility rule is `fail` or `unknown`. | `runEngine`, `simulateRoom`, `pnpm cases`; rules coverage gate met |
| 5 | 24 Oct AM | API foundation | `TC-API-CORE-01..07`: no token gives 401 `AUTH_REQUIRED`; a bad signature, wrong audience or expired token gives 401 `AUTH_INVALID`; a guest token upserts a user; `AppException` produces the envelope, and an unknown error gives 500 `INTERNAL` with no stack in the body; the pipe gives 400 `VALIDATION_FAILED`; boot fails without `MONGODB_URI`; `/health` is public. | Env schema, guard, filter, pipe, logger redaction, throttler |
| 6 | 24 Oct AM | Plans, claims, scoping, retention | `TC-REPO-01..05`: `findOwned` for another user returns null; a malformed ID returns null; an unscoped query throws `UNSCOPED_QUERY`; each collection has a TTL index with `expireAfterSeconds: 0`; the facts unique index exists. `TC-API-CLAIMS-01..09`: list plans; create gives 201; missing consent gives 400; user B gets 404 on GET and DELETE and A's data survives; DELETE removes every child and every blob; storage failure gives 503 and deletes nothing; `expiresAt` is 30 days, or 24 h for guests, with a `FixedClock`. | `ScopedRepository`, plugin, claims module, sweeper |
| 7 | 24 Oct PM | Upload | `TC-UP-01..12`: PDF, JPEG and PNG give 201; text renamed to `.pdf` gives 415; a ZIP or EXE header gives 415; an empty file is rejected; no file gives 400; exactly 10 MB is accepted and one KB over gives 413; six files give 400; a ninth document on the claim gives 409; an encrypted PDF gives 422 and no blob is written; an image under 200 px gives 422; user B's claim gives 404 and the in-memory storage stays empty. | Multer limits, `ParseFilePipe` magic-byte check ([NestJS file upload](https://docs.nestjs.com/techniques/file-upload)), `PdfTextService`, `ImagePreprocessor` |
| 8 | 24 Oct PM | Quote verifier | `TC-QV-01..08`: exact match; hyphenated line break; curly quotes; one OCR slip within tolerance gives `fuzzy`; quote on the next page is found; absent quote gives `none`; empty text layer gives `unverifiable`; an empty quote is never a match. | Pure `verifyQuote()` |
| 9 | 25 Oct AM | LLM adapter contract (install the SDK now) | `TC-LLM-01..09` through the replay `fetch`: a recorded bill fixture produces the expected facts; `"Found"` is normalised; refusal gives `LLM_REFUSED`; `max_tokens` gives `LLM_TRUNCATED`; 429 and 529 give `LLM_UNAVAILABLE`; 413 gives `BUNDLE_TOO_LARGE`; the request body has no `temperature`, `top_p` or `top_k`, the document precedes the text, and the untrusted `context` is present; an injected-document fixture parses and no field can carry a verdict. | `AnthropicLlmService`, `parseExtraction`, `mapSdkError` |
| 10 | 25 Oct AM | Extract and correct facts | `TC-EXT-01..08` with the fake: facts saved with a verification result; not-found facts keep the sentinels; line items not matching the total raise a warning; one failing document still saves the rest; `NO_DOCUMENTS` gives 409; user B gets 404 and the fake is never called; a scanned page gives `unverifiable`; an injection flag raises a warning. `TC-FACT-01..04`: correcting sets source `user-corrected` and `estimateStale`; a bad date gives 400; confirming sets `confirmedByUser`; another user's fact gives 404. | Extraction service and facts controller |
| 11 | 25 Oct PM | Check, simulate, remedies, sample | `TC-CHK-01..03`: sample case B equals its `expected.json`; the estimate is saved with `factsVersion`; an unverified, unconfirmed fact is treated as `unknown`. `TC-SIM-01..03`: a cheaper room lowers the deduction; nothing is saved and facts are unchanged; a bad room gives 400. `TC-REM-01..02`: only catalog entries are returned; no estimate gives 409. `TC-SAMPLE-01..03`: the claim is owned, the fake LLM is never called, an unknown case gives 404, and `expiresAt` is 24 h. | Checks and sample modules |
| 12 | 25 Oct PM | Chat | `TC-CHAT-01..07`: a what-if routes to simulation and the amounts match; an amount not from the engine falls back to the template; a remedy ID outside the allowed set falls back to the template; hide or alter gives the fixed refusal and facts are unchanged; a suspected injection or a refusal gives the safe reply; 401, 404 and 400; 429 after the per-user limit. Live CE-1..CE-6 run nightly. | Classifier, composer, reply guard |
| 13 | 25 Oct late | Ship | Docker smoke test in CI. `pnpm eval:extraction` on 15–30 synthetic claims scored field by field (non-blocking). `docs/TDD.md` links red/green commit pairs. | Deploy |

The testing stack has six parts:

| Tool | Role | Notes |
|---|---|---|
| Vitest 5.0.5 with `@vitest/coverage-v8` | Every test in every package | When Vitest detects an AI coding agent it switches to a compact coverage summary ([Vitest coverage](https://vitest.dev/config/coverage)), which helps Claude Code read results. |
| `unplugin-swc` | Decorator metadata in API tests | |
| supertest (default import) | HTTP tests | Binds the app to an ephemeral port, so parallel files don't collide ([supertest](https://www.npmjs.com/package/supertest)). |
| mongodb-memory-server | Repository and e2e tests | |
| fast-check with `@fast-check/vitest` | Five property tests | Its npm page lists 0.1.1 and fast-check ^3, which may be stale; check it on install ([npm](https://www.npmjs.com/package/@fast-check/vitest)). |
| Injected-`fetch` replay | LLM contract tests | Needs no extra library. |

Coverage gates:

| Package | Lines, functions, statements | Branches |
|---|---|---|
| `packages/rules` | 100% | 95% |
| `packages/shared` | 90% | 90% |
| `apps/api` | 80% | 75% |

The API figures exclude `main.ts`, `*.module.ts` and the prompt files. Coverage is a floor, not a goal; Beck also warns against tests "without assertions just to get code coverage". Expect roughly **130–170 tests**, most of them table rows. The live evals use thresholds the way Langfuse describes: a test passes when its score meets the bar ([Langfuse](https://langfuse.com/blog/2025-10-21-testing-llm-applications)). Require at least 0.9 field accuracy on dates and amounts, and report the quote-verification rate next to it.

If day 3 slips, cut in this order:

1. the LLM reply composer becomes a templated reply (keep the classifier);
2. the Haiku injection screen goes; keep the labels and mandatory confirmation;
3. the retention sweeper goes; keep the TTL indexes and synchronous delete.

Never cut the 404 ownership tests or the rules coverage gate. They are the cheapest evidence for both the 30% engineering score and the 35% AI-practice score.
