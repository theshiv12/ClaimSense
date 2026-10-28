# Server actions (the app's API)

Every action runs on the server, validates its input with a Zod schema from `@claimsense/shared`,
resolves the current user from the session cookie, and returns
`{ ok: true, data } | { ok: false, code: ErrorCode }`. Any id that is malformed or owned by another
user gives `NOT_FOUND` (the page renders 404).

| Action | Input | Returns | Error codes |
|---|---|---|---|
| `signup` | email, password (≥ 8, with a number), displayName?, adultAttested | session cookie | `VALIDATION_FAILED`, `EMAIL_TAKEN` |
| `login` | email, password | session cookie | `AUTH_INVALID` (same for unknown email and wrong password), `RATE_LIMITED` |
| `logout` | none | cookie cleared, session deleted | none |
| `startSample` | caseId `A`–`D` | guest session + claim id | `NOT_FOUND` |
| `createClaim` | planId, subject {relation, treatment}, consent {analysis: true, retention, improve}, admissionDate, room | claim id | `AUTH_REQUIRED`, `VALIDATION_FAILED`, `PLAN_NOT_FOUND` |
| `uploadAndExtract` | claimId, file (PDF/JPEG/PNG ≤ 4 MB) | facts + warnings | `NOT_FOUND`, `FILE_TOO_LARGE`, `FILE_TYPE_NOT_ALLOWED`, `DOCUMENT_LIMIT_REACHED`, `PDF_PASSWORD_PROTECTED`, `LLM_UNAVAILABLE`, `AI_QUOTA_EXCEEDED`, `LLM_OUTPUT_INVALID` |
| `confirmFact` / `editFact` / `addFact` | claimId, factId?, value | fact | `NOT_FOUND`, `VALIDATION_FAILED` |
| `runCheck` | claimId | estimate (saved) | `NOT_FOUND` |
| `simulateRoom` | claimId, category, rentPerDayPaise | scenario estimate (not saved) | `NOT_FOUND`, `VALIDATION_FAILED` |
| `deleteClaim` | claimId | none | `NOT_FOUND` |
| `deleteMe` | none | none; everything for the user is deleted and the session ends | none |

Read paths are server components that call the same owner-scoped finders in `src/server/scope.ts`.
