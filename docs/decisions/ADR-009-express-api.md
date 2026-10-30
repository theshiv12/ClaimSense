# ADR-009: An Express REST API behind the Next.js UI (supersedes ADR-006)

**Date:** 29 Oct 2026 · **Status:** accepted (requested by the human)

**Decision:** the backend moves out of Next.js server actions into `apps/api`: Express 5, TypeScript, one
folder per module (`auth`, `samples`, `plans`, `claims`, `facts`, `estimate`, `extraction`), each with
`*.routes.ts` → `handler` → `*.service.ts`. `apps/web` keeps every screen but holds no database, no Gemini
and no secrets. The browser calls `/api/*` on the web domain and `src/proxy.ts` forwards it to `API_ORIGIN`,
so the session cookie stays first-party and there is no CORS. Server components call the API directly,
forwarding the session cookie.

**Why:**
- A conventional REST API can be tested on its own (supertest), deployed and scaled separately, and reused
  by other clients.
- Behaviour is unchanged. Bodies are the same `ActionResult` with HTTP statuses (`core/errors.ts`), every
  server test was ported with its ID and assertions (`docs/test-cases.md`), and `packages/rules` and
  `packages/shared` did not change apart from response types (`api-views.ts`).

**What replaces what Next gave for free:**
- **CSRF:** the server-action origin check becomes `core/origin.ts` (writes must come from `WEB_ORIGIN`).
- **Body limit:** the server-action limit becomes multer's `MAX_UPLOAD_MB` (413) plus the proxy's
  `proxyClientMaxBodySize`.
- **Session cookies:** handled by `sessionPort`.

**Costs, accepted:**
- **Two deploys.** Web on Vercel with `API_ORIGIN` set; the API on any Node 24 host with the variables in
  `apps/api/.env.example`.
- **Cold starts.** A free API host may cold-start (Render: about 1 min); a paid instance or a second
  Vercel project avoids it.
- **One extra hop on reads.** Every page read now takes one HTTP hop more.

**Rejected:**
- **A public API domain with CORS:** cross-site cookies and CSRF tokens.
- **Express inside Vercel functions:** less like a real Node server.
- **Converting the UI to an SPA:** it would rewrite every screen.
