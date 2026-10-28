# REST API

## Thirteen routes share one token, one error envelope and one 404 rule

**Auth.** Every route except `/health` sits behind a global `AuthGuard`, registered as `APP_GUARD` with `useExisting` so tests could override it ([NestJS testing](https://docs.nestjs.com/fundamentals/testing)). Only `@Public()` opts out. The guard verifies a `Bearer` HS256 JWT with issuer `claimsense-web`, audience `claimsense-api` and a 5-minute expiry, and upserts a user keyed on `(provider, subject)`.

The Next.js server mints that token. Signed-in users get `sub` = their Google `sub`; Google says to use `sub`, not email, because email can change ([Google Identity](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)). Visitors without an account get a **guest** token whose `sub` is `guest:<uuid>`, stored in an httpOnly cookie. This keeps `POST /sample/:caseId` inside the same ownership model: a judge's sample claim belongs to their guest user, and anyone else gets a 404. The browser never calls the API directly, so CORS stays off. A `UserThrottlerGuard` runs after `AuthGuard` and keys limits on `req.user.id`. IP-based limits would see only the Next server's single IP ([NestJS rate limiting](https://docs.nestjs.com/security/rate-limiting)).

**Ownership.** Every `:id` is checked with `ObjectIdSchema` and then looked up with `{ _id, userId }`. A malformed ID, a missing record and another user's record all return the **same 404**. All amounts are integer paise. All dates are `YYYY-MM-DD` strings.

| Route | Request | Success response | Route-specific errors |
|---|---|---|---|
| `GET /health` (public) | none | 200 `{ status: 'ok', info: { mongodb: { status: 'up' } } }` | 503 when MongoDB is down |
| `GET /plans` | none | 200 `{ plans: PlanSummary[] }` | none |
| `POST /claims` | `CreateClaimRequest` | 201 `ClaimSummary` | 422 `PLAN_NOT_FOUND` |
| `GET /claims/:id` | none | 200 `ClaimDetail` | 404 `CLAIM_NOT_FOUND` |
| `DELETE /claims/:id` | none | 204; deletes blobs, then documents, facts, estimates, messages and the claim | 404; 503 `STORAGE_UNAVAILABLE` (nothing deleted, retry) |
| `POST /claims/:id/documents` | multipart `files[]` (at most 5 per request, at most 10 MB each, PDF/JPEG/PNG by magic bytes) + field `kind` | 201 `{ documents: DocumentView[] }` | 413 `FILE_TOO_LARGE`, 415 `FILE_TYPE_NOT_ALLOWED`, 400 `TOO_MANY_FILES`, 409 `DOCUMENT_LIMIT_REACHED`, 422 `PDF_PASSWORD_PROTECTED` / `IMAGE_TOO_SMALL` |
| `POST /claims/:id/extract` | `{ documentIds?: string[] }` (default: all not yet extracted) | 200 `ExtractResponse`; per-document failures are listed, not fatal | 409 `NO_DOCUMENTS`; 503 `LLM_UNAVAILABLE` only if every document failed |
| `PATCH /claims/:id/facts/:factId` | `{ action: 'correct', value }` or `{ action: 'confirm' }` | 200 `{ fact: Fact, estimateStale: true }` | 404 `FACT_NOT_FOUND`; 400 when the value fails that key's schema |
| `POST /claims/:id/check` | `{}` | 200 `Estimate` (saved) | none; unknown facts give `unknown` outcomes, not errors |
| `GET /claims/:id/simulate?room=&rentPerDayPaise=` | `room`: `RoomCategory`; `rentPerDayPaise` optional (default: the plan's cap) | 200 `SimulationResult` (not saved) | 400 for a bad room or rent |
| `GET /claims/:id/remedies?check=R6` | `check`: `RuleId` | 200 `RemediesResponse` | 409 `CHECK_NOT_RUN` |
| `POST /claims/:id/messages` | `{ text }` (1 to 1,000 characters) | 200 `{ message: ChatMessage }` | 429 `RATE_LIMITED`; 503 `LLM_UNAVAILABLE` |
| `POST /sample/:caseId` | `caseId` is one of A, B, B2, C, D | 201 `ClaimDetail` (facts preloaded, estimate computed, no LLM call) | 404 `SAMPLE_NOT_FOUND` |

Every route except `/health` also returns 401 `AUTH_REQUIRED` or `AUTH_INVALID`. Every route that takes a claim ID also returns 404 `CLAIM_NOT_FOUND`, including for another user's claim.

The shapes live in `packages/shared/src/api/`. They are written below as types for brevity; in code each is a Zod schema with an inferred type. Responses are parsed through these schemas before they leave the API. That strips internal fields such as `blobName` and `userId` by construction.

```ts
type PlanSummary       = { planId; insurer; planName; uin; wordingVersion; rulesAsOf;
                           roomRent: PlanConfig['roomRent']; coPayTiers; sumInsuredOptionsPaise: number[] };
type CreateClaimRequest = { planId: string; title?: string; adultAttested: true;
                            consent: { analysis: true; storeDocuments: boolean; version: 'consent-v1' } };
type ClaimSummary      = { id; planId; title; status: 'draft' | 'extracted' | 'checked';
                           isSample: boolean; factsVersion: number; createdAt; expiresAt };
type DocumentView      = { id; kind: DocumentKind; mime: 'application/pdf' | 'image/jpeg' | 'image/png';
                           sizeBytes; pages: number; textLayer: 'present' | 'partial' | 'absent' | 'n/a';
                           extraction: 'pending' | 'done' | 'failed'; errorCode: ErrorCode | null };
type ClaimDetail       = { claim: ClaimSummary; documents: DocumentView[]; facts: Fact[];
                           latestEstimate: Estimate | null; estimateStale: boolean; messages: ChatMessage[] };
type ExtractResponse   = { facts: Fact[]; documents: DocumentView[];
                           warnings: { code: 'BILL_TOTAL_MISMATCH' | 'QUOTE_UNVERIFIED' | 'NO_TEXT_LAYER'
                                             | 'PLAN_MISMATCH' | 'INJECTION_SUSPECTED'; factIds: string[] }[] };
type SimulationResult  = { room: { category: RoomCategory; rentPerDayPaise: number;
                                   assumption: 'at_cap' | 'user_supplied' };
                           baseline: EstimateSummary; scenario: EstimateSummary;
                           deltaPayablePaise: number; deltaOutOfPocketPaise: number };
type RemediesResponse  = { ruleId: RuleId; outcome: RuleOutcome; remedies: Remedy[] };   // catalog entries only
type ChatMessage       = { id; role: 'user' | 'assistant'; text: string; remedyIds: string[];
                           whatIf: SimulationResult | null; createdAt };
type ErrorBody         = { error: { code: ErrorCode; message: string; requestId: string; details?: unknown } };
```

`ErrorCode` is a `z.enum` in `shared/src/errors.ts`, so the API, the tests and the future web app import the same constants. `AppException(code)` carries the HTTP status. One global `@Catch()` filter writes the envelope, logs stack traces only for status 500 and above, and never echoes request content.

| Status | Codes |
|---|---|
| 400 | `VALIDATION_FAILED`, `TOO_MANY_FILES` |
| 401 | `AUTH_REQUIRED`, `AUTH_INVALID` |
| 404 | `CLAIM_NOT_FOUND`, `DOCUMENT_NOT_FOUND`, `FACT_NOT_FOUND`, `SAMPLE_NOT_FOUND` |
| 409 | `NO_DOCUMENTS`, `CHECK_NOT_RUN`, `DOCUMENT_LIMIT_REACHED` |
| 413 | `FILE_TOO_LARGE`, `BUNDLE_TOO_LARGE` |
| 415 | `FILE_TYPE_NOT_ALLOWED` |
| 422 | `PLAN_NOT_FOUND`, `PDF_PASSWORD_PROTECTED`, `PDF_UNREADABLE`, `IMAGE_TOO_SMALL`, `LLM_REFUSED` |
| 429 | `RATE_LIMITED` |
| 500 | `INTERNAL` |
| 502 | `LLM_OUTPUT_INVALID`, `LLM_TRUNCATED`, `LLM_BAD_REQUEST` |
| 503 | `LLM_UNAVAILABLE`, `STORAGE_UNAVAILABLE` |

Extraction runs **synchronously**: one Claude call per document, three at a time, each with a 120-second timeout. The Next server calls the API from its own code, so no browser timeout applies. Long synchronous requests are far easier to test than a job queue. Switch to `202 Accepted` plus polling of `GET /claims/:id` only if the host cuts off long requests. Render's and Railway's limits were not researched.
