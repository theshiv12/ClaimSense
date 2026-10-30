# REST API (`apps/api`, Express 5)

The browser calls these on the web domain (`/api/*`, forwarded by `apps/web/src/proxy.ts`). Server
components call `API_ORIGIN` directly with the session cookie (ADR-009).

Every request is validated with a Zod schema from `@claimsense/shared`: ids come from the path, values from
the JSON body. The session comes from the `cs_session` cookie. Every response body is
`{ ok: true, data } | { ok: false, code: ErrorCode }`. A malformed id, or one owned by another user, gives
`NOT_FOUND` (404), never 403.

**Status per code** (`apps/api/src/core/errors.ts`):

| Status | Codes |
|---|---|
| 400 | `VALIDATION_FAILED`, `PDF_PASSWORD_PROTECTED` |
| 401 | `AUTH_REQUIRED`, `AUTH_INVALID` |
| 404 | `NOT_FOUND`, `PLAN_NOT_FOUND` |
| 409 | `EMAIL_TAKEN`, `DOCUMENT_LIMIT_REACHED` |
| 413 | `FILE_TOO_LARGE` |
| 415 | `FILE_TYPE_NOT_ALLOWED` |
| 422 | `LLM_OUTPUT_INVALID` |
| 429 | `RATE_LIMITED`, `AI_QUOTA_EXCEEDED` |
| 503 | `LLM_UNAVAILABLE` |
| 500 | `INTERNAL_ERROR` |

**Writes** (POST, PATCH, DELETE) must come from `WEB_ORIGIN`. A cross-site write gets 401 `AUTH_REQUIRED`.

| Endpoint | Body | Returns (`data`) | Errors |
|---|---|---|---|
| `POST /api/auth/signup` | email, password (≥ 8, with a number), displayName?, adultAttested | `null` + session cookie | `VALIDATION_FAILED`, `EMAIL_TAKEN` |
| `POST /api/auth/login` | email, password | `null` + session cookie | `AUTH_INVALID` (same for unknown email and wrong password), `RATE_LIMITED` |
| `POST /api/auth/logout` | none | `null`; cookie cleared, session deleted | none |
| `GET /api/auth/me` | none | `CurrentUserView` or `null` (never creates a session) | none |
| `POST /api/samples/:caseId` | none (`A`–`D`) | `{ claimId }` + guest session if none | `VALIDATION_FAILED`, `RATE_LIMITED` |
| `GET /api/plans` | none | `PlanOption[]` | none |
| `GET /api/claims` | none | `ClaimSummary[]` (My claims) | `AUTH_REQUIRED` |
| `POST /api/claims` | planId, subject {relation, treatment}, consent {analysis: true, retention, improve}, admissionDate?, room? | `{ claimId }` | `AUTH_REQUIRED`, `VALIDATION_FAILED`, `PLAN_NOT_FOUND` |
| `GET /api/claims/:claimId` | none | `ClaimView` | `NOT_FOUND` |
| `DELETE /api/claims/:claimId` | none | `null` | `NOT_FOUND` |
| `DELETE /api/me` | none | `null`; everything for the user is deleted and the session ends | `AUTH_REQUIRED` |
| `GET /api/claims/:claimId/facts` | none | `StoredFactView[]` | `NOT_FOUND` |
| `POST /api/claims/:claimId/facts` | key, head, value | `{ fact }` | `NOT_FOUND`, `VALIDATION_FAILED` |
| `PATCH /api/claims/:claimId/facts/:factId` | value | `{ fact }` (user-corrected) | `NOT_FOUND`, `VALIDATION_FAILED` |
| `POST /api/claims/:claimId/facts/:factId/confirm` | none | `{ fact }` | `NOT_FOUND` |
| `POST /api/claims/:claimId/documents` | multipart `file` (PDF/JPEG/PNG ≤ 4 MB) | `UploadResultView` (facts + warnings) | `NOT_FOUND`, `FILE_TOO_LARGE`, `FILE_TYPE_NOT_ALLOWED`, `DOCUMENT_LIMIT_REACHED`, `PDF_PASSWORD_PROTECTED`, `LLM_UNAVAILABLE`, `AI_QUOTA_EXCEEDED`, `LLM_OUTPUT_INVALID` |
| `GET /api/claims/:claimId/estimate` | none | `EstimateView` (estimate, plan, remedies, evidence, precedents, clarifiers (≤ 2, FR-6), needsYou); saved if the facts changed | `NOT_FOUND` |
| `POST /api/claims/:claimId/estimate` | none | `{ estimate }` (saved) | `NOT_FOUND` |
| `POST /api/claims/:claimId/checks/:ruleId/chat` | question (≤ 500), history (≤ 4 turns) | `ChatReplyView` (answer + cited sources; grounded, never stored; ADR-010). | `AUTH_REQUIRED` (incl. guests), `NOT_FOUND` (foreign claim or a passing check), `VALIDATION_FAILED`, `AI_QUOTA_EXCEEDED`, `LLM_UNAVAILABLE`, `LLM_OUTPUT_INVALID` |
| `POST /api/claims/:claimId/explain` | question? (default "Explain my estimate in simple words."), history | `ChatReplyView` (grounded on the whole estimate; FR-11, ADR-011) | as the check chat |
| `GET /healthz` | none | `{ ok: true }` | none |

The response types are in `packages/shared/src/api-views.ts`.
