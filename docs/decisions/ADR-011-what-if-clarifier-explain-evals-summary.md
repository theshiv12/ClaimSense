# ADR-011: What-ifs, clarifier, plain-language explanation, conversation evals, printable summary

**Date:** 30 Oct 2026 · **Status:** proposed: built at the human's request, but the FR-6/11/12/17/18 text and
their test cases (`docs/test-cases.md`, *autopilot*) were drafted by the AI and still need the human's approval.

**Decisions.**

1. **(Superseded by ADR-012: removed.)** **What-ifs are understood in code, answered by the engine (FR-17).** `parseWhatIf` (apps/api) recognises
   five kinds of typed "what if…" (accident, room + rent, admission date or "after the waiting period", condition
   declared, sum insured). `simulateFacts` (packages/rules) applies that one change and re-runs `estimate`.
   The reply is fixed text with before/after amounts. The model is never asked, so no AI quota is used and no
   amount can come from it (golden rule 1). `simulateRoom` now delegates to `simulateFacts`.
   A wrong parse is worse than none: negation, more than one change, compound or unmarked amounts and rents under
   ₹100/day return null (the grounded answer takes over). "What if I say/write it was an accident" is a hide
   request (golden rule 10). Accident and declaration what-ifs say they only count if true; date what-ifs carry the
   medical-advice line and name the date; an unknown waiting period is never reported as "no wait"; a ward-room
   what-if is refused for an ICU stay.
2. **Clarifier (FR-6).** `pickClarifiers` (packages/rules, pure) ranks missing facts by how many Unknown checks
   they block and returns at most 2. Bill lines are never asked (they need the hospital's estimate). A fact a
   document has any value for (even two that disagree) becomes "confirm it on the facts page", so a question can
   never override a document (Engine decision 13).
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
