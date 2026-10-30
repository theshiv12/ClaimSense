# Product requirements

> **TODO tonight (2 min):** export the "ClaimSense: Full PRD" doc from Claude Docs as Markdown and
> paste it below this note. Then mark these as **future scope (not in the one-night build)**:
> Google sign-in, voice, history filters, password reset.
>
> **Update 30 Oct 2026 (ADR-010):** a *grounded* chat about one check ("Ask about this check") and reviewed
> *similar cases* (Ombudsman/IRDAI/consumer-court decisions) are now in scope. Open-ended chat stays out.

## MVP scope for the one-night build

See `docs/one-night-build.md` section 1. Core journey:

1. Consent + claim setup
2. Upload a policy schedule and a hospital estimate (or try sample case B)
3. Check the extracted facts (quote, page, verified badge) and confirm or correct them
4. Estimate: payout, out-of-pocket, label, one row per check with its clause
5. Room simulator, remedies, grounded "Ask about this check" and reviewed similar cases (ADR-010)
6. History list
7. Delete my data

## Requirements added after the MVP (*autopilot draft, needs your approval*, ADR-011)

The full PRD text is not in the repo, so these were written from the item names in your scope table and the
original NestJS plan. Correct them in the PR; the tests follow whatever you approve.

| ID | Requirement (draft) | Status | Where |
|---|---|---|---|
| FR-6 | **Clarifier (≤ 2 questions).** When checks are Unknown, ask at most 2 short questions, the facts that would settle the most checks. Answers are saved as user-stated facts and the estimate re-runs. If a document already gave the value, ask to confirm it on the facts page instead of overriding it. | Built | `pickClarifiers` (rules), `ClarifierCard` |
| FR-11 | **Plain-language explanation.** "Explain my estimate in simple words": a grounded answer from the engine's own sentences and amounts, checked in code like the check chat. English or Hinglish. Signed-up users only. | Built | `POST /api/claims/:id/explain`, `ExplainEstimate` |
| FR-12 | **Summary PDF.** A one-page printable summary: verdict, amounts, each check with its clause, remedies, the escalation steps, the disclaimer. "Download PDF" opens the browser's print dialog; nothing is stored. | Built | `/claims/[id]/summary` |
| FR-16 | **"What can I do?" conversation.** Per-check remedies, the room what-if, and the grounded check chat with reviewed similar cases. | Built | ADR-010 |
| FR-17 | **What-if questions.** A typed "what if…" is recognised in code and the engine answers with before/after amounts, not saved. Scenarios: accident; room type + rent; admission date or "after the waiting period"; condition declared; sum insured. Anything else goes to the grounded answer. | Built | `parseWhatIf`, `simulateFacts` |
| FR-18 | **Conversation evals CE-1..CE-6.** CE-1 "why was this cut" cites the clause; CE-2 a what-if is answered by the engine; CE-3 a hide request is refused without the model; CE-4 an injected amount or verdict never reaches the user; CE-5 off-topic is refused; CE-6 Hinglish in, Hinglish out, with citations. Run in CI with a fake model; a live run against Gemini is manual. | Built | `apps/api/evals/` |
| — | **Two supported plans.** | Waiting for the second plan's policy wording PDF in `docs/source/`; plan values are never invented (ADR-007). | — |
