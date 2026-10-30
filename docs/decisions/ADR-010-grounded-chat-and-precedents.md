# ADR-010: "Ask about this check" (grounded chat) and similar Ombudsman cases

**Date:** 30 Oct 2026 · **Status:** accepted (requested by the human; moves "the LLM chat" and
"court-case data" out of future scope in docs/prd.md)

**Decision.** In a check's "What can I do?" panel:

1. **Ask about this check.** A signed-up user can ask questions about one check. `POST /api/claims/:id/checks/:ruleId/chat`
   builds numbered sources for that check:
   - its reason (the same `explain()` sentence the user sees)
   - the plan clause
   - the user's own document lines (`evidenceFor`)
   - the catalog remedies for that rule and outcome
   - matched reviewed cases

   Gemini answers only from these sources and cites their ids (`integrations/gemini.ts`, `answer`).
2. **Similar cases.** Reviewed public decisions (Insurance Ombudsman, IRDAI, consumer courts) on the same rule and
   outcome come from `config/precedents.json`. The claim's insurer comes first, then the newest, at most 3.

**Safeguards (in code, not only in the prompt):**
- **Hiding or changing facts** (English, Hinglish, Hindi): refused before any AI call (golden rule 10).
- **The answer is checked before the user sees it** (`modules/chat/vet.ts`, an allow-list):
  - Any number in it must come from a **trusted** source: the engine's reason, the plan clause, the catalog
    remedies or reviewed cases. Numbers from the user's document lines or browser history never count.
  - Number words and units (lakh, thousand, percent…) and other scripts' digits are not allowed.
  - Verdict wording ("approved", "will be paid", "rejected", "pass ho jayega"…) is not allowed;
    "pre-approval" is.
  - Anything else gets a fixed safe reply (golden rule 1). Unknown citation ids are dropped, and the disclaimer
    is appended.
- **Hiding or changing facts** is also screened in the earlier questions the browser sends. Only earlier
  *questions* go to the model, labelled untrusted; earlier answers are never sent.
- **The e2e fake model** (`LLM_FAKE`) runs only with an `e2e-` key and never when a deploy is detected.
- **Sources and the question are untrusted data** for the model (golden rule 8). The JSON-schema output is
  Zod-parsed.
- **Nothing is stored**, and logs carry only `rule`, `refused` and the citation count (golden rule 6). Uploaded
  files are not sent; only the check's text is.
- **Quota.** A daily chat quota per user (`AI_DAILY_CHATS_PER_USER`, default 20), refunded when the model fails.
- **Guests (samples) can't chat.** Samples promise "no AI call", and guests are free to create.
- **Precedents are never invented.** Only entries a human has verified against the source load
  (`PrecedentCatalogSchema` is strict, so a draft with `needsReview` fails, like plan configs in ADR-007). Drafts
  live in `config/precedents/drafts/`.

**Costs.** The chat sends the check's text and the question to Google Gemini's free tier (`docs/compliance.md`),
which is disclosed under the chat box. The answer quality depends on the sources: with no reviewed cases yet, the
model says it has none.

**Rejected:**
- **Open chat from the model's own knowledge:** wrong or legal-sounding advice, and money outside the engine.
- **Other users' outcomes as "similar cases":** privacy.
- **Storing conversations:** health data at rest for no user benefit.
