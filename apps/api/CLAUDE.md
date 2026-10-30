# apps/api (Express 5): rules for this folder

Root `CLAUDE.md` golden rules apply here too. Why this app exists: `docs/decisions/ADR-009-express-api.md`.

## Where things go

```
src/app.ts               createApp(): helmet, request log, /api → Origin check, JSON 100 kb, cookies, db, session
src/server.ts            listen(PORT), graceful shutdown (not imported by tests)
src/core/                env, db, models/, errors (ActionError, fail, STATUS), http (handler, parse, sendError),
                         session (loadUser, requireUser, sessionPort), origin (CSRF), logger, scope (owner finders)
src/modules/<name>/      <name>.routes.ts   paths + middleware; ids from req.params, values from req.body
                         <name>.service.ts  business logic; gets ids/values/SessionPort, never req/res
                         *.test.ts          over HTTP (test/actions.ts keeps the old action names)
src/modules/chat/        grounded "Ask about this check" (ADR-010): sources → Gemini → checked in code; never stored
src/modules/explain/     "Explain my estimate" on the same grounded pipeline (FR-11)
evals/                   CE-1..6 scenarios (CI via evals.test.ts) + live.ts (manual, real Gemini)
src/integrations/        gemini.ts (ONLY @google/genai importer: extract + answer), llm.ts, pdf-text.ts
src/lib/                 pure helpers: quote-verify, normalize, evidence, mongo-uri, plans, precedents, samples, expiry
test/                    global-setup (memory MongoDB), setup (one DB per file), http + actions + users helpers,
                         fake-llm, fixtures/gemini (recorded responses, synthetic documents only)
```

## Rules

- **A new endpoint** = a route in its module's `*.routes.ts` wrapped in `handler(name, fn)`, which returns
  `{ ok: true, data }` or, for a thrown `ActionError`, `{ ok: false, code }` with `STATUS[code]`.
- Order inside a handler: `requireUser(req)` **before** `parse(schema, input)` (session before input, TC-OWN-*).
- Validate with the shared Zod schemas: path ids and body fields go through the same `*InputSchema`.
- Every query on claims, facts and estimates goes through `core/scope.ts` (userId first; bad id → 404).
- Mount routers with `mount(app, pattern, router)` so the request log shows the pattern, never real ids.
- Logs: `[http] METHOD /pattern STATUS ms`, `[api] <name> failed: <ErrorClass>`, `[extract] claim=… facts=n`.
  Never bodies, queries, file names, quotes or facts.
- Uploads: multer memory storage only, `MAX_UPLOAD_MB` limit (413), session checked before the body is read;
  the bytes are dropped when the request ends (golden rule 9).
- Writes must come from `WEB_ORIGIN` (`core/origin.ts`); a refused write is `AUTH_REQUIRED` (no 403 code by design).
- Sessions: `sessionPort(req, res)` is the only thing that sets or clears `cs_session` (HttpOnly, Secure, Lax).

## Tests

- Vitest + supertest + mongodb-memory-server; `FakeLlm` via `setLlmForTests`; never live Gemini.
- Each endpoint: no session → 401 `AUTH_REQUIRED`, another user's id → 404, bad input → 400, happy path.
