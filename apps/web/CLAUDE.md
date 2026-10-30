# apps/web (Next.js): rules for this folder

Root `CLAUDE.md` golden rules apply here too.

## Where things go

```
src/app/                 routes: /, /login, /signup, /claims, /claims/new, /claims/[id], /claims/[id]/facts, /sample/[caseId]
src/proxy.ts             forwards /api/* to the Express API (API_ORIGIN, read per request); see ADR-009
src/lib/api/server.ts    server components: apiGet / apiPage (401 → /login, 404 → notFound) / currentUser
src/lib/api/client.ts    client components: signup, createClaim, addFact, uploadAndExtract… → ActionResult
src/lib/sample-preview.ts landing card: sample B through the pure rules engine (no API call)
src/components/ui/       Button, Chip, Card, Field, Toggle, Segmented (no business logic)
src/components/claim/    FactRow, CheckRow (+ FixItPanel "What can I do?"), PayoutBar, Quote, RoomSimulator, ScenarioResult, RemediesPanel, ClaimRow
```

The web app has **no database, no Gemini and no secrets**. Its only setting is `API_ORIGIN`
(`apps/web/.env.example`). Server code, models and the Gemini adapter live in `apps/api` (see its CLAUDE.md).

## Rules

- **Before creating a component, search `components/`.** Extend with a prop; no near-duplicates.
- Server components read through `lib/api/server.ts`; client components only for interactive parts
  (fact edit, room simulator, upload) and call `lib/api/client.ts`. The browser never talks to MongoDB or Gemini.
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
- Client components that call the API take an injectable action prop (`actions`, `simulate`) so tests pass fakes;
  the API itself is tested in `apps/api`.
- Test what the user sees (text, roles), not implementation details.
