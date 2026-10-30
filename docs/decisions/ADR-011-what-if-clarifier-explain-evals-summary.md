# ADR-011: What-ifs, clarifier, plain-language explanation, conversation evals, printable summary

**Date:** 30 Oct 2026 · **Status:** accepted (requested by the human; requirement text drafted by the AI and
pending the human's approval in `docs/prd.md`)

**Decisions.**

1. **What-ifs are understood in code, answered by the engine (FR-17).** `parseWhatIf` (apps/api) recognises
   five kinds of typed "what if…" (accident, room + rent, admission date or "after the waiting period", condition
   declared, sum insured). `simulateFacts` (packages/rules) applies that one change and re-runs `estimate`.
   The reply is fixed text with before/after amounts. The model is never asked, so no AI quota is used and no
   amount can come from it (golden rule 1). `simulateRoom` now delegates to `simulateFacts`.
2. **Clarifier (FR-6).** `pickClarifiers` (packages/rules, pure) ranks missing facts by how many Unknown checks
   they block and returns at most 2. Bill lines are never asked (they need the hospital's estimate). A fact a
   document already gave, still waiting for the user's check, becomes "confirm it on the facts page", so a
   question can never override a document (Engine decision 13).
3. **Plain-language explanation (FR-11).** `POST /api/claims/:id/explain` reuses the check chat's grounded
   pipeline (`runGrounded`: quota → Gemini → `finalize` with the `vet.ts` allow-list) with the whole estimate as
   sources (`S-VERDICT`, `S-CHECK-R1..R8`, remedies), all built in code from the engine's output.
4. **Conversation evals (FR-18).** `apps/api/evals/conversations/CE-1..6.json` run in every `pnpm test` through
   the real API with `FakeLlm` (proving routing and the code checks). `pnpm --filter @claimsense/api eval:live`
   runs the same scenarios against Gemini on sample B without a database; it is manual (live Gemini calls are an
   approval point) and writes `evals/reports/` (gitignored).
5. **Summary (FR-12).** A print-ready page; the browser saves it as PDF. No PDF library, nothing stored.

**Rejected.** A model-based intent classifier for what-ifs (amounts would depend on the model's reading);
server-side PDF generation (a new dependency for the same result); a second plan with invented values.
