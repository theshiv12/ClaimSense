# apps/web (Next.js): rules for this folder

Root `CLAUDE.md` golden rules apply here too.

## Where things go

```
src/app/                 routes: /, /login, /signup, /claims, /claims/new, /claims/[id], /claims/[id]/facts, /sample/[caseId]
src/server/              import 'server-only' in every file
  db.ts                  cached Mongoose connection (serverless-safe)
  models/                User, Session, Claim, Fact, Estimate (TTL index on expiresAt)
  auth.ts                argon2id (@node-rs/argon2), session cookie, requireUser(), guest sessions
  scope.ts               owner-scoped finders: userId first; foreign or malformed id → null → notFound()
  pdf-text.ts            unpdf text layer per page
  quote-verify.ts        exact / fuzzy / none / unverifiable (pure, unit-tested)
  gemini.ts              the ONLY file importing @google/genai; fallback model on 429
  actions/               server actions; return { ok: true, data } | { ok: false, code }
src/components/ui/       Button, Chip, Card, Field, Toggle, Segmented (no business logic)
src/components/claim/    FactRow, CheckRow, PayoutBar, Quote, RoomSimulator, RemediesPanel, ClaimRow
test/fixtures/gemini/    recorded Gemini responses (synthetic documents only)
```

## Rules

- **Before creating a component, search `components/`.** Extend with a prop; no near-duplicates.
- Server components fetch through `src/server`; client components only for interactive parts
  (fact edit, room simulator, upload). The browser never talks to MongoDB or Gemini.
- Forms validate with the Zod schemas from `@claimsense/shared` (same rules server-side).
- Session cookie: random 32-byte token, `httpOnly`, `Secure`, `SameSite=Lax`; only its SHA-256 is stored.
- Uploads: PDF/JPEG/PNG checked by magic bytes, **≤ 4 MB** (Vercel's body limit is 4.5 MB),
  ≤ 8 per claim; resize photos in the browser first (longest side ≤ 2000 px). Never store bytes.
- Free-tier states: "Today's free AI limit is used up — enter the facts yourself" on
  `LLM_UNAVAILABLE` / `AI_QUOTA_EXCEEDED`, with a manual fact form.
- Design tokens (Figma): teal `#0E7A66`, ink `#12211E`, muted `#4A5B56`, background `#F6F7F5`,
  border `#DDE3DF`; chips pass `#E3F2EE`/`#095C4D`, warn `#FFF1DE`/`#8A4A06`, risk `#FDECEA`/`#8F1D14`;
  font Plus Jakarta Sans via `next/font`. Use Tailwind theme tokens, not raw hex in components.
- Status always has an icon **and** a word (Pass / Deduction / Fail / Unknown), never colour alone.
- Required copy: every result shows "Estimate, not a guarantee. Only your insurer decides. Not
  medical or legal advice." Labels never say "approved".
- Accessibility: real `<button>`/`<label>`, keyboard reachable, `aria-label` on icon-only buttons.

## Tests (written first, see the `tdd` skill)

- Vitest + Testing Library for components with logic (CheckRow states, PayoutBar widths).
- Server actions: Vitest with mongodb-memory-server and `FakeLlm`; cover no session,
  another user's id (404), bad input, and the happy path.
- Test what the user sees (text, roles), not implementation details.
