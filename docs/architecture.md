# Architecture

**Principle:** the model reads documents; **code decides the money**. Rule values come from a
human-verified plan config, never from the model at runtime.

```
Browser ──► Next.js on Vercel (apps/web)
              ├─ pages (server components) ── src/server (server-only) ──► MongoDB Atlas M0
              ├─ pages: / · /signup · /login · /claims · /claims/new · /claims/[id]/facts ·
              │         /claims/[id] · /sample/[caseId] (read paths via server/views.ts + scope.ts)
              ├─ server actions: signup · login · logout · startSample/openSample (POST) ·
              │                  createClaim · uploadAndExtract · confirmFact · editFact ·
              │                  addFact · runCheck · simulateRoom · deleteClaim · deleteMe
              │        uploadAndExtract:
              │          bytes (≤ 4 MB, magic-byte check) → unpdf text layer
              │          → document slot + daily quota taken atomically (given back if the model fails)
              │          → gemini.ts: Interactions API, inline document, untrusted-content
              │            instruction, JSON schema from Zod, store:false, fallback on 429/5xx ──► Gemini
              │          → Zod parse → normalise (₹/lakh, Indian dates) → quote-verify on the stated
              │            page + value-in-quote check (exact / fuzzy / none / unverifiable)
              │          → facts saved; bytes discarded (never stored)
              └─ packages/rules (pure): toClaimFacts → R1–R5 → non-payables → R6 → R7 → R8 → verdict
                    reads config/plans/*.json (ClauseRef per value) and config/remedies.json
```

**Trust boundaries**

1. The **browser** sees only rendered pages and server-action results; no keys, no database access.
2. **`src/server`** holds the secrets (`MONGODB_URI`, `GEMINI_API_KEY`); only `gemini.ts` talks to Gemini.
3. **Gemini output is untrusted:** it's parsed with Zod, quotes are checked in code, and unverified
   facts need the user's confirmation.
4. **`packages/rules`** has no I/O. Same input, same output. That's what makes the estimate testable
   and defensible.

**Data and retention**

| Data | Where | How long |
|---|---|---|
| Uploaded files | Memory only during the request | Never stored |
| Users, sessions, claims, facts, estimates | MongoDB, scoped by `userId` | TTL: claims/facts/estimates 7 days; sessions 7 days; guests 24 h |
| Deletion | "Delete my data" / "Delete claim" | Immediate `deleteMany` by `userId` (+ `claimId`) |

**Free-tier limits and how they're handled:** Gemini daily limits (per-user quota, fallback model,
manual fact entry); Vercel 4.5 MB body (4 MB cap, in-browser image resize); Atlas M0 0.5 GB
(nothing large is stored).

**Decisions:** `docs/decisions/`. Superseded design (NestJS API, Claude API, Azure Blob):
`docs/reference/nest-plan/`.

**As built (29 Oct 2026).** Rate limits: login 5 tries / 15 min per email (attempt recorded before checking,
dummy-hash verify for unknown emails), 20 samples / hour per IP, `AI_DAILY_EXTRACTIONS_PER_USER` uploads a
day. Plan configs load through `LoadablePlanConfigSchema` (no `needsReview`), with room rent by sum insured
(ADR-007). Tests: Vitest on mongodb-memory-server with `FakeLlm`; Playwright on `next start` with an
in-memory DB (`apps/web/scripts/e2e-server.mjs`), so CI needs no secrets.
